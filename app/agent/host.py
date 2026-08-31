"""Agent host:会话与消息存在 Revornix 的库里;每轮对话驱动一个 pi sidecar 进程,
它的工具面是 /agent/tools/*(写操作过确认卡)。

关键机制(逐项对应 OpenStudio 验证过的设计):
- **队列而不是合并**:会话在跑时发来的消息落库标 queued,上一轮结束后 drain 成
  独立的一轮 —— 排队消息能被看见、能撤回、能被 steer 进当前轮。
- **turn 令牌**:铸 JWT 时把 agent_session_id 写进 claim,工具回调与确认卡的归属
  从令牌反查,不靠参数转述(转述可以伪造)。
- **流是内存态**:`_streams` 存本轮的 text/timeline 快照,SSE 端点每 100ms 推一次
  变化(seq 变才推),断线重连拿到的是完整快照而不是丢失的中间态。
- **中断可见**:后端重启把卡在 running 的会话拨回 idle、作废其 pending 确认卡,
  并留一条可见的中断说明。
"""

from __future__ import annotations

import asyncio
import base64
import json
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
from agent import confirmations
from agent.sidecar import AdapterError, abort_turn, compact_session, run_turn, steer_turn
from common.common import safe_json_loads
from common.jwt_utils import ACCESS_TOKEN_TYPE, create_jwt
from common.logger import exception_logger, format_log_message
from common.markdown_helpers import (
    get_markdown_content_by_document_id,
    get_markdown_content_by_section_id,
)
from common.usage_billing import persist_model_usage
from config.base import AGENT_API_BASE
from data.milvus.search import naive_search_for_documents
from data.neo4j.search import section_graph_search
from data.sql.base import async_session_context
from enums.document import DocumentEmbeddingStatus, DocumentSummarizeStatus
from enums.mcp import MCPCategory
from enums.user import AIInteractionLanguage
from proxy.ai_model_proxy import AIModelProxy
from proxy.file_system_proxy import FileSystemProxy

TURN_TOKEN_EXPIRES = timedelta(hours=3)

# 与历史 document_ai/section_ai 管道相同的限量,行为不因重构而变。
DOCUMENT_MARKDOWN_LIMIT = 7000
DOCUMENT_SUMMARY_LIMIT = 320
DOCUMENT_TOP_K = 6
SECTION_MARKDOWN_LIMIT = 6000
SECTION_TOP_K = 6
SECTION_GRAPH_TOP_K = 6
SECTION_GRAPH_ENTITY_LIMIT = 8
SECTION_GRAPH_ENTITY_LABEL_LIMIT = 3
SECTION_MAX_DOCUMENT_CATALOG = 12
REFERENCE_EXCERPT_LIMIT = 220

# 与 sidecar 的 compaction.ts 同一个数:运行时压缩用它,界面显示另一个数就会对不上。
FALLBACK_CONTEXT_WINDOW = 32000
CHARS_PER_TOKEN = 3.5

MAX_AGENT_IMAGES = 4
MAX_AGENT_IMAGE_BYTES = 5 * 1024 * 1024

SYSTEM_PROMPT_TEMPLATE = """你是 Revornix AI,运行在用户的 Revornix 知识工作区里。
你的工作对象是用户的知识库:文档、专栏、标签、知识图谱,通过内置工具操作它们:
- 检索优先用 search_document(向量 + 图谱扩展的混合检索,返回内容片段);
  浏览用 search_my_documents / search_my_unread_documents / search_my_recent_documents /
  search_my_starred_documents;看单篇用 get_document_detail;图谱用 search_mine_graph /
  search_document_graph / search_section_graph。
- 写操作(创建/修改/删除、触发摘要/播客/转写/图谱等生成任务)会创建确认卡,
  由用户在界面上批准后才真正执行。你只需调用工具并等待 —— 工具会阻塞到用户做出决定,
  然后把最终结果返回给你。返回了结果就意味着事情已经发生,不要再说「等待确认」。
- 拿不准要不要做的事,先在对话里跟用户讲清楚再调用工具;删除类操作尤其如此。
- 需要一段独立的、上下文很占地方的调查(翻很多文档、读很多专栏)时,用 run_subagent
  派一个子智能体去做:它有自己的上下文,只把结论带回来,你这边不会被中间过程占满。
  子智能体只有只读工具,做不了任何改动 —— 要改还是你自己来。
- 工具结果里的文档 id 是后续操作的钥匙,记住它们。
{language_instruction}
用用户使用的语言回复,简洁、面向阅读与知识管理,不要提及内部实现细节。"""


class HostError(RuntimeError):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# 流态(内存)
# ---------------------------------------------------------------------------

# 进行中的轮的实时流,按会话 id 索引。SSE 端点是快照式消费:seq 变就推一帧。
_streams: dict[int, dict] = {}


def get_stream_state(session_id: int) -> dict:
    state = _streams.get(session_id)
    if not state:
        return {"text": "", "done": True, "seq": 0, "timeline": []}
    snapshot = dict(state)
    snapshot["timeline"] = [dict(item) for item in state.get("timeline", [])]
    return snapshot


def _stream_reset(session_id: int) -> None:
    _streams[session_id] = {
        "text": "",
        "done": False,
        "seq": 0,
        "timeline": [],
        "tool_starts": {},
        # 本轮第一个 token(正文或思考,谁先算谁)到达的 monotonic 时刻。
        "first_token_at": None,
    }


def _mark_first_token(state: dict) -> None:
    """只记第一次 —— 后面的 delta 不该把它往后推。"""
    if state.get("first_token_at") is None:
        state["first_token_at"] = time.monotonic()


def _close_open_thinking(timeline: list[dict]) -> None:
    """把最后一块还开着的思考标记为结束。

    **不能只靠 `thinking_end`**:它取决于供应商发不发那个事件。正文开始、或者开始
    调工具,本身就是思考已经结束的确凿证据。
    """
    if timeline and timeline[-1].get("type") == "thinking" and not timeline[-1].get("done"):
        timeline[-1]["done"] = True


def _stream_append(session_id: int, delta: str) -> None:
    state = _streams.get(session_id)
    if state is None:
        return
    _mark_first_token(state)
    state["text"] += delta
    timeline: list[dict] = state.setdefault("timeline", [])
    _close_open_thinking(timeline)
    if timeline and timeline[-1].get("type") == "text":
        timeline[-1]["text"] = str(timeline[-1].get("text", "")) + delta
    else:
        timeline.append({"type": "text", "text": delta})
    state["seq"] += 1


def _stream_thinking(session_id: int, event: dict) -> None:
    """思考增量 → 时间线上的思考块。和正文分开成条:思考不是回答。"""
    state = _streams.get(session_id)
    if state is None:
        return
    timeline: list[dict] = state.setdefault("timeline", [])
    if event.get("type") == "thinking_end":
        for item in reversed(timeline):
            if item.get("type") == "thinking":
                item["done"] = True
                break
    else:
        delta = str(event.get("delta", ""))
        if not delta:
            return
        _mark_first_token(state)
        if timeline and timeline[-1].get("type") == "thinking" and not timeline[-1].get("done"):
            timeline[-1]["text"] = str(timeline[-1].get("text", "")) + delta
        else:
            timeline.append({"type": "thinking", "text": delta, "done": False})
    state["seq"] += 1


def _stream_tool_event(session_id: int, event: dict) -> None:
    """pi 工具事件 → 流里的工具卡:tool_start 建卡(running),tool_end 更新(done/error)。

    subtool 是子智能体内部的一步,同样建卡/收卡,只是条目带 parent_id(发起它的
    run_subagent 调用)—— 界面据此嵌套在父卡下显示。
    """
    state = _streams.get(session_id)
    if state is None:
        return
    timeline: list[dict] = state.setdefault("timeline", [])
    if event.get("type") == "subagent_result":
        # 后台派发的子智能体跑完了:把存档填回发起它的那张 run_subagent 卡。
        parent_id = str(event.get("parentCallId") or "")
        for item in timeline:
            tool = item.get("tool")
            if item.get("type") == "tool" and isinstance(tool, dict) and tool.get("id") == parent_id:
                result = tool.get("result")
                if not isinstance(result, dict):
                    result = {"content": result} if result is not None else {}
                details = result.get("details")
                if not isinstance(details, dict):
                    details = {}
                details["subagent"] = event.get("archive")
                result["details"] = details
                tool["result"] = result
                break
        state["seq"] += 1
        return
    if event.get("type") == "subtool":
        call_id = str(event.get("toolCallId") or "")
        starts = state.setdefault("tool_starts", {})
        if event.get("phase") == "start":
            starts[f"sub:{call_id}"] = time.monotonic()
            timeline.append({
                "type": "subtool",
                "parent_id": str(event.get("parentCallId") or ""),
                "tool": {
                    "id": call_id,
                    "name": event.get("toolName"),
                    "args": event.get("args"),
                    "status": "running",
                    "usage": {"started_at": _now().isoformat()},
                },
            })
        else:
            started = starts.pop(f"sub:{call_id}", None)
            usage = {"finished_at": _now().isoformat()}
            if isinstance(started, (int, float)):
                usage["duration_seconds"] = round(max(0.0, time.monotonic() - started), 1)
            for item in timeline:
                tool = item.get("tool")
                if item.get("type") == "subtool" and isinstance(tool, dict) and tool.get("id") == call_id:
                    tool["status"] = "error" if event.get("isError") else "done"
                    tool["result"] = event.get("result")
                    tool["usage"] = {**(tool.get("usage") if isinstance(tool.get("usage"), dict) else {}), **usage}
                    break
        state["seq"] += 1
        return
    if event.get("type") == "tool_start":
        _close_open_thinking(timeline)
        tool_call_id = str(event.get("toolCallId") or "")
        state.setdefault("tool_starts", {})[tool_call_id] = time.monotonic()
        timeline.append({
            "type": "tool",
            "tool": {
                "id": tool_call_id,
                "name": event.get("name"),
                "args": event.get("args"),
                "status": "running",
                "usage": {"started_at": _now().isoformat()},
            },
        })
    elif event.get("type") == "tool_end":
        tool_call_id = str(event.get("toolCallId") or "")
        started = state.setdefault("tool_starts", {}).pop(tool_call_id, None)
        usage = {"finished_at": _now().isoformat()}
        if isinstance(started, (int, float)):
            usage["duration_seconds"] = round(max(0.0, time.monotonic() - started), 1)
        for item in timeline:
            tool = item.get("tool")
            if item.get("type") == "tool" and isinstance(tool, dict) and tool.get("id") == tool_call_id:
                tool["status"] = "error" if event.get("isError") else "done"
                tool["result"] = event.get("result")
                tool["usage"] = {**(tool.get("usage") if isinstance(tool.get("usage"), dict) else {}), **usage}
                break
    state["seq"] += 1


def _stream_finish(session_id: int, final_text: str) -> None:
    state = _streams.setdefault(session_id, {"text": "", "done": False, "seq": 0, "timeline": []})
    state["text"] = final_text
    timeline: list[dict] = state.setdefault("timeline", [])
    _close_open_thinking(timeline)
    existing_text = "".join(str(item.get("text", "")) for item in timeline if item.get("type") == "text")
    if final_text and not existing_text:
        timeline.append({"type": "text", "text": final_text})
    state["done"] = True
    state["seq"] += 1


def _timeline_for_payload(stream_state: dict, final_text: str) -> list[dict]:
    """落库的、可直接渲染的事件序列 —— 刷新之后工具卡还在它实际发生的位置。"""
    timeline: list[dict] = []
    for item in stream_state.get("timeline") or []:
        if item.get("type") == "text":
            text = str(item.get("text", ""))
            if text:
                timeline.append({"type": "text", "text": text})
        elif item.get("type") == "tool" and isinstance(item.get("tool"), dict):
            timeline.append({"type": "tool", "tool": dict(item["tool"])})
        elif item.get("type") == "subtool" and isinstance(item.get("tool"), dict):
            timeline.append({"type": "subtool", "parent_id": item.get("parent_id"), "tool": dict(item["tool"])})
        elif item.get("type") == "thinking":
            text = str(item.get("text", ""))
            if text:
                # 落库时一律标 done:重新打开会话时那段思考早就结束了。
                timeline.append({"type": "thinking", "text": text, "done": True})
    existing_text = "".join(str(item.get("text", "")) for item in timeline if item.get("type") == "text")
    if final_text and not existing_text:
        timeline.append({"type": "text", "text": final_text})
    return timeline


# ---------------------------------------------------------------------------
# 会话与轮次
# ---------------------------------------------------------------------------


def _language_instruction(language: int | None) -> str:
    if language == AIInteractionLanguage.CHINESE:
        return (
            "Always answer in Simplified Chinese unless the user explicitly asks "
            "you to switch to another language."
        )
    if language == AIInteractionLanguage.ENGLISH:
        return (
            "Always answer in English unless the user explicitly asks "
            "you to switch to another language."
        )
    return (
        "Reply in the same language as the latest user message when it is clear. "
        "If the latest message does not provide a clear language signal, follow "
        "the dominant language of the conversation."
    )


async def create_session(
    db: AsyncSession,
    *,
    user_id: int,
    title: str = "新对话",
    model_id: int | None = None,
    document_id: int | None = None,
    section_id: int | None = None,
    enable_mcp: bool = False,
) -> models.agent.AgentSession:
    session = models.agent.AgentSession(
        uuid=uuid4().hex,
        user_id=user_id,
        title=title,
        status="idle",
        adapter="pi",
        model_id=model_id,
        document_id=document_id,
        section_id=section_id,
        enable_mcp=enable_mcp,
        create_time=_now(),
        update_time=_now(),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


def mint_turn_token(user: models.user.User, agent_session_id: int | None = None) -> str:
    """turn 令牌带上**它属于哪次对话** —— 确认卡的归属从这里出发。

    铸令牌的这一刻正好知道答案,所以答案从这里出发;参数转述可以伪造,令牌不行。
    它同时也是一份普通 access token,sidecar 拿它回调 /agent/tools 时走的就是
    get_current_user 那条标准鉴权。
    """
    claims: dict[str, Any] = {
        "sub": user.uuid,
        "type": ACCESS_TOKEN_TYPE,
        "auth_epoch": user.auth_epoch,
    }
    if agent_session_id is not None:
        claims["agent_session_id"] = agent_session_id
    return create_jwt(claims, expires_delta=TURN_TOKEN_EXPIRES)


async def _resolve_chat_model(
    db: AsyncSession, session: models.agent.AgentSession, user_id: int
) -> tuple[int, str, str, str | None]:
    """会话选定模型 → 用户默认对话模型。返回 (model_id, model_name, base_url, api_key)。"""
    resolved_model_id = session.model_id
    if resolved_model_id is None:
        db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
        resolved_model_id = db_user.default_revornix_model_id if db_user is not None else None
    if resolved_model_id is None:
        raise AdapterError("还没有配置对话模型:请在设置里选一个默认的 Revornix 模型,或在会话上指定模型。")
    proxy = await AIModelProxy.create(user_id=user_id, model_id=resolved_model_id)
    configuration = proxy.get_configuration()
    return resolved_model_id, configuration.model_name, configuration.base_url, configuration.api_key


async def _mcp_server_configs(db: AsyncSession, user_id: int) -> list[dict]:
    """用户注册并启用的外部 MCP server,转成 sidecar 帧里的形状。"""
    servers = await crud.mcp.search_mcp_servers_async(db=db, user_id=user_id)
    configs: list[dict] = []
    for server in servers:
        if not server.enable:
            continue
        if server.category == MCPCategory.STD:
            std = await crud.mcp.get_std_mcp_server_by_base_server_id_async(db=db, base_server_id=server.id)
            if std is None or not std.cmd:
                continue
            configs.append({
                "name": server.name,
                "category": "stdio",
                "command": std.cmd,
                "args": safe_json_loads(std.args, []),
                "env": safe_json_loads(std.env, {}),
            })
        elif server.category == MCPCategory.HTTP:
            http = await crud.mcp.get_http_mcp_server_by_base_server_id_async(db=db, base_server_id=server.id)
            if http is None or not http.url:
                continue
            configs.append({
                "name": server.name,
                "category": "http",
                "url": http.url,
                "headers": safe_json_loads(http.headers, {}),
            })
    return configs


# ---------------------------------------------------------------------------
# grounding:绑定文档 / 专栏的会话,把既有管道的上下文组装原样搬进来
# ---------------------------------------------------------------------------


def _truncate_text(text: str, limit: int) -> str:
    normalized = " ".join(text.split()).strip()
    if len(normalized) <= limit:
        return normalized
    return normalized[: max(0, limit - 1)].rstrip() + "…"


def _sanitize_excerpt(text: str) -> str:
    sanitized = text.replace("\r", " ").replace("\n", " ")
    sanitized = sanitized.replace("```", " ").replace("`", " ").replace("#", " ")
    while "![](" in sanitized:
        start = sanitized.find("![](")
        end = sanitized.find(")", start)
        if end == -1:
            break
        sanitized = sanitized[:start] + " " + sanitized[end + 1:]
    return " ".join(sanitized.split()).strip()


def _serialize_citation(document_id: int, document_title: str, chunk_id: str, excerpt: str, score: float | None) -> dict:
    return {
        "document_id": document_id,
        "document_title": document_title,
        "chunk_id": chunk_id,
        "excerpt": excerpt,
        "score": score,
    }


def _coerce_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


async def _document_grounding(
    db: AsyncSession, *, session: models.agent.AgentSession, question: str
) -> tuple[str, list[dict]]:
    """单文档绑定:文档知识(标题/摘要/markdown 摘录)+ 按当前问题的向量召回。"""
    document_id = int(session.document_id)
    db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=document_id)
    if db_document is None:
        return "", []

    markdown_content = await get_markdown_content_by_document_id(
        document_id=document_id, user_id=db_document.creator_id
    )
    markdown_excerpt = _truncate_text(markdown_content, DOCUMENT_MARKDOWN_LIMIT) if markdown_content else ""

    summarize_task = await crud.task.get_document_summarize_task_by_document_id_async(db=db, document_id=document_id)
    summary = (
        summarize_task.summary
        if summarize_task is not None
        and summarize_task.status == DocumentSummarizeStatus.SUCCESS
        and summarize_task.summary
        else None
    )

    citations: list[dict] = []
    vector_blocks: list[str] = []
    embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(db=db, document_id=document_id)
    if embedding_task is not None and embedding_task.status == DocumentEmbeddingStatus.SUCCESS:
        try:
            vector_hits = await naive_search_for_documents(
                search_text=question, document_ids=[document_id], top_k=DOCUMENT_TOP_K
            )
        except Exception as e:  # noqa: BLE001 — 检索是增强,挂了不该拖垮这轮对话
            exception_logger.warning(format_log_message("agent_document_recall_failed", document_id=document_id, error=e))
            vector_hits = []
        seen: set[str] = set()
        for index, hit in enumerate(vector_hits, start=1):
            chunk_id = str(hit.get("chunk_id") or "")
            if not chunk_id or chunk_id in seen:
                continue
            seen.add(chunk_id)
            excerpt = _truncate_text(_sanitize_excerpt(str(hit.get("text") or "")), REFERENCE_EXCERPT_LIMIT)
            citations.append(_serialize_citation(document_id, db_document.title, chunk_id, excerpt, hit.get("score")))
            vector_blocks.append(f"[Reference {index}]\nDocument ID: {document_id}\nExcerpt: {excerpt}")

    blocks = [
        f"Document ID: {document_id}",
        f"Document Title: {db_document.title}",
        f"Document Description: {db_document.description or 'N/A'}",
    ]
    if summary:
        blocks.extend(["Document Summary:", _truncate_text(summary, DOCUMENT_SUMMARY_LIMIT)])
    if markdown_excerpt:
        blocks.extend(["Document Content:", markdown_excerpt])
    if vector_blocks:
        blocks.extend(["Relevant Document Excerpts:", "\n\n".join(vector_blocks)])
    knowledge = "\n\n".join(blocks)
    rules = "\n".join(
        [
            "Operating rules for this chat:",
            f"- The active document is fixed: #{document_id} ({db_document.title}).",
            "- The document has already been identified. Never use tools to guess which document the user means.",
            "- Answer from the provided document knowledge first.",
            "- Only call tools when the user explicitly asks, or when the provided document knowledge is insufficient.",
            "- If you answer beyond the current document, explicitly say that you are expanding scope.",
        ]
    )
    return f"【当前绑定的文档知识】\n{knowledge}\n\n{rules}", citations


async def _section_grounding(
    db: AsyncSession, *, session: models.agent.AgentSession, question: str
) -> tuple[str, list[dict]]:
    """专栏绑定:专栏知识 + 向量召回 + Neo4j 图扩展(与既有 section_ai 管道同一套)。"""
    section_id = int(session.section_id)
    db_section = await crud.section.get_section_by_section_id_async(db=db, section_id=section_id)
    if db_section is None:
        return "", []

    section_markdown = await get_markdown_content_by_section_id(
        section_id=section_id, user_id=db_section.creator_id, allow_missing=True
    )
    section_markdown_excerpt = _truncate_text(section_markdown, SECTION_MARKDOWN_LIMIT) if section_markdown else ""

    db_documents = await crud.section.get_documents_for_section_by_section_id_async(db=db, section_id=section_id)
    document_ids = [int(document.id) for document in db_documents]
    documents_by_id = {int(document.id): document for document in db_documents}

    embedding_tasks = await crud.task.get_document_embedding_tasks_by_document_ids_async(db=db, document_ids=document_ids)
    embedded_document_ids = [
        int(task.document_id) for task in embedding_tasks if task.status == DocumentEmbeddingStatus.SUCCESS
    ]
    summarize_tasks = await crud.task.get_document_summarize_tasks_by_document_ids_async(db=db, document_ids=document_ids)
    summaries_by_document_id = {
        int(task.document_id): task.summary
        for task in summarize_tasks
        if task.status == DocumentSummarizeStatus.SUCCESS and task.summary
    }

    citations: list[dict] = []
    vector_blocks: list[str] = []
    seen: set[str] = set()
    vector_hits: list[dict] = []
    if embedded_document_ids:
        try:
            vector_hits = await naive_search_for_documents(
                search_text=question, document_ids=embedded_document_ids, top_k=SECTION_TOP_K
            )
        except Exception as e:  # noqa: BLE001
            exception_logger.warning(format_log_message("agent_section_recall_failed", section_id=section_id, error=e))
    for index, hit in enumerate(vector_hits, start=1):
        chunk_id = str(hit.get("chunk_id") or "")
        if not chunk_id or chunk_id in seen:
            continue
        seen.add(chunk_id)
        document_id = _coerce_int(hit.get("doc_id"))
        db_document = documents_by_id.get(document_id) if document_id is not None else None
        if db_document is None:
            continue
        excerpt = _truncate_text(_sanitize_excerpt(str(hit.get("text") or "")), REFERENCE_EXCERPT_LIMIT)
        citations.append(_serialize_citation(document_id, db_document.title, chunk_id, excerpt, hit.get("score")))
        vector_blocks.append(f"[Reference {index}]\nDocument ID: {document_id}\nExcerpt: {excerpt}")

    graph_entity_blocks: list[str] = []
    graph_context_blocks: list[str] = []
    seed_chunk_ids = [str(hit.get("chunk_id") or "") for hit in vector_hits if hit.get("chunk_id")]
    if document_ids and seed_chunk_ids:
        try:
            # 图扩展只在当前专栏关联文档范围内做,避免把全局图里的无关内容捞进来。
            # Neo4j 是增强链路,异常不该把整轮对话打断。
            graph_result = await section_graph_search(
                document_ids=document_ids,
                seed_chunk_ids=seed_chunk_ids,
                expand_limit=SECTION_GRAPH_TOP_K,
                entity_limit=SECTION_GRAPH_ENTITY_LIMIT,
                entity_label_limit=SECTION_GRAPH_ENTITY_LABEL_LIMIT,
            )
        except Exception as e:  # noqa: BLE001
            exception_logger.warning(
                format_log_message("agent_section_graph_expand_failed", section_id=section_id, error=e)
            )
            graph_result = {}
        for entity in graph_result.get("entities") or []:
            entity_text = " ".join(str(entity.get("text") or "").split()).strip()
            if not entity_text:
                continue
            mention_count = entity.get("mention_count") or 0
            doc_scope = entity.get("document_ids") or []
            entity_line = f"- {entity_text}"
            if mention_count:
                entity_line += f" ({mention_count} chunks / {len(doc_scope)} docs)"
            graph_entity_blocks.append(entity_line)
        reference_index = len(vector_blocks) + 1
        for hit in graph_result.get("expanded_chunks") or []:
            chunk_id = str(hit.get("chunk_id") or "")
            if not chunk_id or chunk_id in seen:
                continue
            seen.add(chunk_id)
            document_id = _coerce_int(hit.get("doc_id"))
            db_document = documents_by_id.get(document_id) if document_id is not None else None
            if db_document is None:
                continue
            excerpt = _truncate_text(_sanitize_excerpt(str(hit.get("text") or "")), REFERENCE_EXCERPT_LIMIT)
            citations.append(_serialize_citation(document_id, db_document.title, chunk_id, excerpt, None))
            entity_texts = [
                " ".join(str(text).split()).strip()
                for text in (hit.get("entity_texts") or [])
                if str(text).strip()
            ][:SECTION_GRAPH_ENTITY_LABEL_LIMIT]
            lines = [f"[Reference {reference_index}]", f"Document ID: {document_id}"]
            if entity_texts:
                lines.append(f"Graph Link: {', '.join(entity_texts)}")
            lines.append(f"Excerpt: {excerpt}")
            graph_context_blocks.append("\n".join(lines))
            reference_index += 1

    catalog_blocks: list[str] = []
    for db_document in db_documents[:SECTION_MAX_DOCUMENT_CATALOG]:
        summary = summaries_by_document_id.get(int(db_document.id)) or db_document.description or ""
        catalog_blocks.append(
            f"- Document ID: {db_document.id}\n  Title: {db_document.title}\n"
            f"  Summary: {_truncate_text(summary, DOCUMENT_SUMMARY_LIMIT) if summary else 'N/A'}"
        )

    blocks = [
        f"Section ID: {section_id}",
        f"Section Title: {db_section.title}",
        f"Section Description: {db_section.description or 'N/A'}",
    ]
    if section_markdown_excerpt:
        blocks.extend(["Section Markdown:", section_markdown_excerpt])
    if vector_blocks:
        blocks.extend(["Relevant Document Excerpts:", "\n\n".join(vector_blocks)])
    if graph_entity_blocks:
        blocks.extend(["Entity Graph Signals:", "\n".join(graph_entity_blocks)])
    if graph_context_blocks:
        blocks.extend(["Graph-Expanded Document Excerpts:", "\n\n".join(graph_context_blocks)])
    if catalog_blocks:
        blocks.extend(["Related Documents:", "\n".join(catalog_blocks)])
    knowledge = "\n\n".join(blocks)
    rules = "\n".join(
        [
            "Operating rules for this chat:",
            f"- The active section is fixed: #{section_id} ({db_section.title}).",
            "- The section has already been identified. Never use tools to guess which section or document the user means.",
            "- Answer from the provided section knowledge first.",
            "- Only call tools when the user explicitly asks, or when the provided section knowledge is insufficient.",
            "- If the question is about the user's personal writing beyond this section, you may use global search tools — and say so.",
        ]
    )
    return f"【当前绑定的专栏知识】\n{knowledge}\n\n{rules}", citations


async def build_system_prompt(db: AsyncSession, session: models.agent.AgentSession, question: str = "") -> tuple[str, list[dict]]:
    """这一轮实际发出去的系统提示 + grounding 引用( citations 给前端卡片)。

    绑定文档/专栏的会话每轮重新组装:文档内容会变,检索跟着问题走。
    """
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=session.user_id)
    language = db_user.default_ai_interaction_language if db_user is not None else None
    prompt = SYSTEM_PROMPT_TEMPLATE.format(language_instruction=_language_instruction(language))
    citations: list[dict] = []
    if session.document_id is not None and question:
        grounding, citations = await _document_grounding(db, session=session, question=question)
    elif session.section_id is not None and question:
        grounding, citations = await _section_grounding(db, session=session, question=question)
    else:
        grounding = ""
    if grounding:
        prompt = f"{prompt}\n\n{grounding}"
    return prompt, citations


# ---------------------------------------------------------------------------
# 图片附件:与旧管道同一解析路径(文件系统路径 / URL / data URL),产出 pi 的形状
# ---------------------------------------------------------------------------


async def _resolve_images(user_id: int, image_paths: list[str]) -> list[dict[str, str]]:
    paths = [p.strip() for p in image_paths if isinstance(p, str) and p.strip()][:MAX_AGENT_IMAGES]
    if not paths:
        return []
    out: list[dict[str, str]] = []
    used = 0
    file_service = await FileSystemProxy.create(user_id=user_id)
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for path in paths:
            try:
                if path.startswith("data:image/"):
                    header, _, data = path.partition(",")
                    mime = header.removeprefix("data:").removesuffix(";base64")
                    raw = base64.b64decode(data)
                    mime_type = mime or "image/png"
                elif path.startswith("http://") or path.startswith("https://"):
                    response = await client.get(path)
                    response.raise_for_status()
                    raw = response.content
                    mime_type = response.headers.get("Content-Type") or "image/png"
                else:
                    content = await file_service.get_file_content_by_file_path(file_path=path)
                    raw = content.encode("utf-8") if isinstance(content, str) else content
                    import mimetypes

                    guessed, _ = mimetypes.guess_type(path)
                    mime_type = guessed if guessed and guessed.startswith("image/") else "image/png"
            except Exception as e:  # noqa: BLE001 — 一张图读不到不该让整轮失败
                exception_logger.warning(format_log_message("agent_image_resolve_failed", path=path[:100], error=e))
                continue
            if not raw or used + len(raw) > MAX_AGENT_IMAGE_BYTES:
                continue
            used += len(raw)
            out.append({"data": base64.b64encode(raw).decode("ascii"), "mimeType": mime_type})
    return out


# ---------------------------------------------------------------------------
# 轮次执行
# ---------------------------------------------------------------------------


def _usage_from_started(started: float, first_token_at: float | None = None) -> dict:
    """这一轮的耗时。**测不到的不写进去** —— 缺键和 0 是两回事。"""
    usage = {"duration_seconds": round(max(0.0, time.monotonic() - started), 1)}
    if isinstance(first_token_at, (int, float)):
        usage["first_token_seconds"] = round(max(0.0, first_token_at - started), 2)
    return usage


async def post_user_message(
    db: AsyncSession,
    session: models.agent.AgentSession,
    content: str,
    user: models.user.User,
    *,
    images: list[str] | None = None,
) -> models.agent.AgentMessage:
    """落一条用户消息并驱动一轮(会话在跑则排队)。"""
    if session.status == "running":
        # 排队,不是 steer。排队等整个 reason-act 循环跑完、作为自己的一轮来跑,
        # 这几乎总是"用户紧接着问了一句"的意思;steer 是切进正在跑的循环,是有意为之的动作
        # (steer_queued_message),不该是默认。
        # 发送者跟着消息走:排队的轮由后台任务跑,那时没有请求、没有用户。
        message = models.agent.AgentMessage(
            session_id=session.id,
            role="user",
            content=content,
            payload=json.dumps({"queued": True, "queued_by": user.id, "images": images or []}, ensure_ascii=False),
            create_time=_now(),
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        # **落库之后再 drain 一次。** 「读 status」和「写消息」之间那一轮完全可能跑完并 drain
        # 过了,而这条消息随后才落库 —— 它就会躺在一个 idle 的会话里再也没人捞。
        await _drain_queue(session.id)
        return message
    message = models.agent.AgentMessage(
        session_id=session.id,
        role="user",
        content=content,
        payload=json.dumps({"images": images or []}, ensure_ascii=False) if images else None,
        create_time=_now(),
    )
    session.status = "running"
    if session.title == "新对话" and content.strip():
        session.title = content.strip()[:60]
    db.add(message)
    await db.commit()
    await db.refresh(message)

    token = mint_turn_token(user, session.id)
    asyncio.get_running_loop().create_task(
        _run_turn_task(session.id, content, images or [], token, user.id)
    )
    return message


async def _run_turn_task(session_id: int, prompt: str, images: list[str], token: str, user_id: int) -> None:
    """跑一轮。永远不安静地死:任何失败都落一条带 error 的助手消息并把会话拨回 idle。"""
    _stream_reset(session_id)
    final_text = ""
    turn_started = time.monotonic()
    async with async_session_context() as db:
        session = await db.get(models.agent.AgentSession, session_id)
        if session is None:
            return
        model_id: int | None = None
        try:
            model_id, model_name, base_url, api_key = await _resolve_chat_model(db, session, user_id)
            system_prompt, citations = await build_system_prompt(db, session, question=prompt)
            provider = {
                "base_url": base_url,
                "api_key": api_key or "",
                "vendor": "",
                # 旧管道无条件把图片发给模型(能不能看懂由供应商决定),保持这个行为。
                "vision": True if images else None,
            }
            mcp_servers = await _mcp_server_configs(db, user_id) if session.enable_mcp else []
            result = await run_turn(
                session_id=session_id,
                prompt=prompt,
                system_prompt=system_prompt,
                api_base=AGENT_API_BASE,
                token=token,
                provider=provider,
                model=model_name,
                adapter_state=json.loads(session.adapter_state) if session.adapter_state else None,
                mcp_servers=mcp_servers,
                thinking_level=session.thinking_level or "off",
                images=await _resolve_images(user_id, images),
                on_delta=lambda delta: _stream_append(session_id, delta),
                on_tool=lambda event: _stream_tool_event(session_id, event),
                on_thinking=lambda event: _stream_thinking(session_id, event),
            )
            final_text = result.text
            if result.adapter_state is not None:
                session.adapter_state = json.dumps(result.adapter_state, ensure_ascii=False)
            stream_state = get_stream_state(session_id)
            timeline = _timeline_for_payload(stream_state, final_text)
            # 空轮不落库:没有文本也没有工具调用,说明模型调用在上游就失败了。
            if not final_text.strip() and not timeline:
                raise AdapterError("模型没有返回任何内容,请检查模型供应商配置。")
            usage = _usage_from_started(turn_started, stream_state.get("first_token_at"))
            usage["metering"] = result.usage or {}
            assistant_message = models.agent.AgentMessage(
                session_id=session.id,
                role="assistant",
                content=final_text,
                payload=json.dumps(
                    {
                        "usage": usage,
                        **({"context": result.context} if result.context else {}),
                        # 压缩必须被看见:静默压缩会让用户以为模型"忘了"早期内容。
                        **({"compaction": result.compaction} if result.compaction else {}),
                        **({"citations": citations} if citations else {}),
                        **({"timeline": timeline} if timeline else {}),
                    },
                    ensure_ascii=False,
                ),
                create_time=_now(),
            )
            db.add(assistant_message)
            await db.flush()
            if model_id is not None:
                await persist_model_usage(
                    user_id=user_id,
                    model_id=model_id,
                    usage_details=result.usage,
                    source="agent",
                    idempotency_key=f"agent-message:{assistant_message.id}",
                )
        except AdapterError as exc:
            assistant_message = models.agent.AgentMessage(
                session_id=session.id,
                role="assistant",
                content="智能体执行失败,请稍后重试。",
                error=str(exc)[:800],
                payload=json.dumps({"usage": _usage_from_started(turn_started)}, ensure_ascii=False),
                create_time=_now(),
            )
            db.add(assistant_message)
        except Exception as exc:  # noqa: BLE001 — 后台任务绝不允许安静地死
            exception_logger.exception(format_log_message("agent_turn_crashed", session_id=session_id, error=exc))
            assistant_message = models.agent.AgentMessage(
                session_id=session.id,
                role="assistant",
                content="智能体执行异常。",
                error=str(exc)[:800],
                payload=json.dumps({"usage": _usage_from_started(turn_started)}, ensure_ascii=False),
                create_time=_now(),
            )
            db.add(assistant_message)
        finally:
            session.status = "idle"
            session.update_time = _now()
            try:
                await db.commit()
            except Exception:  # noqa: BLE001
                # 会话可能在轮还在跑时被删除:没有行可标 idle,让异常传出去会杀掉
                # _stream_finish,留前端对着一个已不存在的会话转圈。
                exception_logger.warning(f"Could not finalise session {session_id}; it may have been deleted")
                await db.rollback()
            _stream_finish(session_id, final_text)
    # 在 db 块之外 drain:下一轮会自己开会话,嵌套会共用连接。
    await _drain_queue(session_id)


async def _drain_queue(session_id: int) -> None:
    """把排队的下一条消息作为自己的一轮跑掉。"""
    try:
        await _drain_queue_locked(session_id)
    except Exception:  # noqa: BLE001 — 后台 drain 不能把进程带走
        exception_logger.exception(f"Draining the queue for session {session_id} failed")


async def _drain_queue_locked(session_id: int) -> None:
    async with async_session_context() as db:
        session = await db.get(models.agent.AgentSession, session_id)
        if session is None:
            return
        # **先抢占,再看队列。** 「读到 idle」和「置成 running」如果不是一步,两个 drain 会
        # 同时通过检查、同时取走同一条消息、同时起一轮 —— 用户看到那条消息被回答了两遍。
        claimed = (
            await db.execute(
                update(models.agent.AgentSession)
                .where(models.agent.AgentSession.id == session_id, models.agent.AgentSession.status != "running")
                .values(status="running")
            )
        ).rowcount
        await db.commit()
        if not claimed:
            return
        await db.refresh(session)
        pending = await _queued_messages(db, session)
        if not pending:
            # 抢到了却没活干:必须把 status 放回去,否则这个会话永远停在 running。
            session.status = "idle"
            await db.commit()
            return
        message = pending[0]
        payload = json.loads(message.payload or "{}")
        owner_id = payload.get("queued_by")
        owner = await db.get(models.user.User, owner_id) if owner_id else None
        await _unqueue(db, message)
        if owner is None:
            # 没有发送者就没有身份可跑。标记照样清掉,免得它在每一轮后都被重试。
            exception_logger.warning(f"queued message {message.id} has no sender; not running it")
            session.status = "idle"
            await db.commit()
            return
        await db.commit()
        token = mint_turn_token(owner, session_id)
    asyncio.get_running_loop().create_task(
        _run_turn_task(session_id, message.content, payload.get("images") or [], token, owner.id)
    )


async def _queued_messages(db: AsyncSession, session: models.agent.AgentSession) -> list[models.agent.AgentMessage]:
    """等待中的消息,最旧的在前。

    显式标记而不是按位置推断:一条消息被 steer 进正在跑的轮之后就不再是排队的,
    看它在对话里的位置永远看不出来这一点。
    """
    messages = (
        await db.scalars(
            select(models.agent.AgentMessage)
            .where(models.agent.AgentMessage.session_id == session.id, models.agent.AgentMessage.role == "user")
            .order_by(models.agent.AgentMessage.create_time)
        )
    ).all()
    return [m for m in messages if (json.loads(m.payload or "{}")).get("queued")]


async def _unqueue(db: AsyncSession, message: models.agent.AgentMessage) -> None:
    """把消息从队列里拿出来。

    时间戳故意重打:对话按 create_time 排,排队的消息是按"敲下那一刻"记的 ——
    不重打它会排在上一轮的回答之前,对话读起来就是所有问题连着所有回答。
    它进入对话的时刻是被取出的一刻。
    """
    payload = json.loads(message.payload or "{}")
    payload.pop("queued", None)
    payload.pop("queued_by", None)
    message.payload = json.dumps(payload, ensure_ascii=False) if payload else None
    message.create_time = _now()


async def steer_queued_message(db: AsyncSession, session: models.agent.AgentSession, message_id: int) -> bool:
    """把排队消息切进正在跑的轮,而不是让它等。没有在跑的轮返回 False(保持排队)。"""
    message = await db.get(models.agent.AgentMessage, message_id)
    payload = json.loads(message.payload or "{}") if message is not None else {}
    if message is None or message.session_id != session.id or not payload.get("queued"):
        raise HostError("找不到这条排队消息")
    if not steer_turn(session.id, message.content):
        return False
    await _unqueue(db, message)
    await db.commit()
    return True


async def cancel_queued_message(db: AsyncSession, session: models.agent.AgentSession, message_id: int) -> int:
    """撤回一条还没跑的消息,返回剩余排队数。"""
    message = await db.get(models.agent.AgentMessage, message_id)
    if message is None or message.session_id != session.id or not (json.loads(message.payload or "{}")).get("queued"):
        raise HostError("这条消息已经开始处理,无法撤回")
    await db.delete(message)
    await db.commit()
    return len(await _queued_messages(db, session))


async def queued_messages(db: AsyncSession, session: models.agent.AgentSession) -> list[models.agent.AgentMessage]:
    return await _queued_messages(db, session)


async def stop_turn(db: AsyncSession, session: models.agent.AgentSession) -> bool:
    """停掉正在跑的轮,已产出的部分保留。没有在跑返回 False —— 按慢了一拍的停止键不是错误。"""
    if session.status != "running":
        return False
    return abort_turn(session.id)


async def compact_session_context(db: AsyncSession, session: models.agent.AgentSession, user: models.user.User) -> dict:
    """手动整理上下文(界面上的「立即整理」)。

    压缩要调一次模型做摘要,所以是用户主动触发而不是后台悄悄跑。压完回存 adapter_state
    并在对话里留一条 system 消息 —— 压缩必须被看见。
    """
    _, model_name, base_url, api_key = await _resolve_chat_model(db, session, user.id)
    result = await compact_session(
        api_base=AGENT_API_BASE,
        token=mint_turn_token(user, session.id),
        provider={"base_url": base_url, "api_key": api_key or "", "vendor": ""},
        model=model_name,
        adapter_state=json.loads(session.adapter_state) if session.adapter_state else None,
    )
    if result.adapter_state is not None:
        session.adapter_state = json.dumps(result.adapter_state, ensure_ascii=False)
    if result.compaction:
        db.add(
            models.agent.AgentMessage(
                session_id=session.id,
                role="system",
                content="",
                payload=json.dumps(
                    {"compaction": result.compaction, **({"context": result.context} if result.context else {})},
                    ensure_ascii=False,
                ),
                create_time=_now(),
            )
        )
    await db.commit()
    return {"context": session_context(db, session), "compaction": result.compaction}


def session_context(db: AsyncSession, session: models.agent.AgentSession) -> dict | None:
    """会话当前的上下文水位(前端画进度条)。

    窗口取不到不等于未知:sidecar 一直在用 32000 的回退值跑压缩,这里也回落到同一个数
    —— 藏起来会让用户以为"没有上限"。
    """
    try:
        state = json.loads(session.adapter_state) if session.adapter_state else []
    except json.JSONDecodeError:
        state = []
    return {
        "tokens": _estimate_state_tokens(state),
        "window": FALLBACK_CONTEXT_WINDOW,
    }


def _estimate_state_tokens(state: Any) -> int:
    """按字符估算 pi 消息数组的 token 量(与 sidecar compaction.ts 同一个比率)。

    显示用途。运行时的压缩判断用的是供应商回报的真实 usage,在 sidecar 里做。
    """
    if not isinstance(state, list):
        return 0
    return math.ceil(len(json.dumps(state, ensure_ascii=False)) / CHARS_PER_TOKEN)


# ---------------------------------------------------------------------------
# 第三方(API key)无状态问答:tp 路由的 /tp/document/ask 走这里
# ---------------------------------------------------------------------------


async def _ask_once(
    *,
    user: models.user.User,
    question: str,
    grounding: str,
    history: list[dict[str, str]] | None,
    model_id: int | None,
    on_delta: Any = None,
    source: str,
) -> str:
    resolved_model_id = model_id if model_id is not None else user.default_revornix_model_id
    if resolved_model_id is None:
        raise AdapterError("The user has not set a default model")
    configuration = (await AIModelProxy.create(user_id=user.id, model_id=resolved_model_id)).get_configuration()

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        language_instruction=_language_instruction(user.default_ai_interaction_language)
    )
    if grounding:
        system_prompt = f"{system_prompt}\n\n{grounding}"
    if history:
        transcript = "\n".join(f"{'用户' if m.get('role') == 'user' else '助手'}: {m.get('content', '')}" for m in history)
        system_prompt += f"\n\n【本次会话此前的一问一答,仅供上下文参考】\n{transcript}"

    token = mint_turn_token(user)
    result = await run_turn(
        session_id=0,  # 无会话,不注册进 _LIVE —— steer/abort 对无状态调用无意义
        prompt=question,
        system_prompt=system_prompt,
        api_base=AGENT_API_BASE,
        token=token,
        provider={"base_url": configuration.base_url, "api_key": configuration.api_key or "", "vendor": ""},
        model=configuration.model_name,
        adapter_state=None,
        on_delta=on_delta,
    )
    if result.usage:
        await persist_model_usage(
            user_id=user.id,
            model_id=resolved_model_id,
            usage_details=result.usage,
            source=source,
        )
    return result.text


async def ask_document_once(
    *,
    user: models.user.User,
    document_id: int,
    question: str,
    history: list[dict[str, str]] | None = None,
    model_id: int | None = None,
    on_delta: Any = None,
) -> str:
    """无状态的文档问答:不建会话、不落库消息 —— 公共 API 的语义是「一问一答」。

    多轮历史由调用方自带,摊平进系统提示而不是伪造 pi 消息(伪造的 assistant
    消息形状极脆,供应商一升级就悄悄炸)。
    """
    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=document_id)
        if db_document is None:
            raise HostError("Document not found")
        fake_session = models.agent.AgentSession(
            user_id=user.id,
            document_id=document_id,
            section_id=None,
        )
        grounding, _citations = await _document_grounding(db, session=fake_session, question=question)
    return await _ask_once(
        user=user,
        question=question,
        grounding=grounding,
        history=history,
        model_id=model_id,
        on_delta=on_delta,
        source="tp_document_ask",
    )


async def ask_section_once(
    *,
    user: models.user.User,
    section_id: int,
    question: str,
    history: list[dict[str, str]] | None = None,
    model_id: int | None = None,
    on_delta: Any = None,
) -> str:
    """无状态的专栏问答。语义同 ask_document_once。"""
    async with async_session_context() as db:
        db_section = await crud.section.get_section_by_section_id_async(db=db, section_id=section_id)
        if db_section is None:
            raise HostError("Section not found")
        fake_session = models.agent.AgentSession(
            user_id=user.id,
            document_id=None,
            section_id=section_id,
        )
        grounding, _citations = await _section_grounding(db, session=fake_session, question=question)
    return await _ask_once(
        user=user,
        question=question,
        grounding=grounding,
        history=history,
        model_id=model_id,
        on_delta=on_delta,
        source="tp_section_ask",
    )


# ---------------------------------------------------------------------------
# 启动时拨回被中断的会话
# ---------------------------------------------------------------------------

#: 中断说明的原文。留在对话里,用户才知道上一轮没跑完。
INTERRUPTED_NOTICE = "上一轮对话因后端重启而中断,请重新发送。"


async def reconcile_orphaned_agent_sessions(db: AsyncSession) -> int:
    """把重启前卡在 running 的会话拨回 idle。

    turn 跑在进程内的 asyncio Task + sidecar 子进程上,后端一重启(开发 --reload 尤其频繁)
    任务即死,finally 永远执行不到 —— 会话从此永远「思考中」。启动时统一拨回,并补一条
    可见的中断说明;那一轮留下的 pending 确认卡一起作废(批准是当场执行的,没有上下文的
    动作不该还能被点下去)。
    """
    stale = (
        await db.scalars(select(models.agent.AgentSession).where(models.agent.AgentSession.status == "running"))
    ).all()
    for session in stale:
        session.status = "idle"
        db.add(
            models.agent.AgentMessage(
                session_id=session.id,
                role="assistant",
                content=INTERRUPTED_NOTICE,
                error="backend restarted mid-turn",
                create_time=_now(),
            )
        )
    if stale:
        await confirmations.cancel_pending_for_sessions(
            db, [session.id for session in stale], reason="backend restarted mid-turn"
        )
        await db.commit()
    return len(stale)
