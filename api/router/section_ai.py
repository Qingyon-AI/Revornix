import json
import time
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langfuse import propagate_attributes
from mcp_use import MCPAgent
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_current_user_short_lived
from common.interpret_event import EventInterpreter, base_event
from common.logger import exception_logger, format_log_message
from common.markdown_helpers import get_markdown_content_by_section_id
from common.usage_collector import UsageCollector
from common.usage_billing import persist_model_usage_from_snapshot
from data.sql.base import async_session_context
from data.milvus.search import naive_search_for_documents
from data.neo4j.search import section_graph_search
from enums.document import DocumentEmbeddingStatus, DocumentSummarizeStatus
from router.ai import (
    _build_agent_error_message_key,
    _build_ai_language_instruction,
    _build_human_message_with_images,
    _build_mcp_recursion_limit_notice_key,
    _is_graph_recursion_limit_error,
    _normalize_chat_images,
    create_agent,
)
from router.logic_helpers import ensure_private_section_access

section_ai_router = APIRouter()

SECTION_MARKDOWN_LIMIT = 6000
SECTION_DOCUMENT_SUMMARY_LIMIT = 320
SECTION_REFERENCE_EXCERPT_LIMIT = 220
SECTION_TOP_K = 6
SECTION_GRAPH_TOP_K = 6
SECTION_GRAPH_ENTITY_LIMIT = 8
SECTION_GRAPH_ENTITY_LABEL_LIMIT = 3
SECTION_MAX_DOCUMENT_CATALOG = 12


def _sse(event: dict[str, Any]) -> str:
    """Serialize a server-sent-event payload into the wire format."""
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _normalize_whitespace(text: str) -> str:
    """Collapse repeated whitespace so context blocks stay compact and stable."""
    return " ".join(text.split()).strip()


def _truncate_text(text: str, limit: int) -> str:
    """Trim normalized text to a maximum length while preserving a visible ellipsis."""
    normalized = _normalize_whitespace(text)
    if len(normalized) <= limit:
        return normalized
    return normalized[: max(0, limit - 1)].rstrip() + "…"


def _sanitize_chunk_citation_excerpt(text: str) -> str:
    """Remove noisy markdown syntax from retrieved excerpts before showing or prompting."""
    sanitized = text
    sanitized = sanitized.replace("\r", " ")
    sanitized = sanitized.replace("\n", " ")
    sanitized = sanitized.replace("```", " ")
    sanitized = sanitized.replace("`", " ")
    sanitized = sanitized.replace("#", " ")
    while "![](" in sanitized:
        start = sanitized.find("![](")
        end = sanitized.find(")", start)
        if end == -1:
            break
        sanitized = sanitized[:start] + " " + sanitized[end + 1 :]
    return _normalize_whitespace(sanitized)


def _coerce_int(value: Any) -> int | None:
    """Safely coerce loose values from search backends into integers."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _serialize_chunk_citation(
    *,
    document_id: int,
    document_title: str,
    chunk_id: str,
    excerpt: str,
    score: float | None,
) -> dict[str, Any]:
    """Convert internal chunk evidence fields into the public section citation schema."""
    return schemas.section.SectionAskChunkCitation(
        document_id=document_id,
        document_title=document_title,
        chunk_id=chunk_id,
        excerpt=excerpt,
        score=score,
    ).model_dump()


def _build_section_agent_system_prompt(
    *,
    system_prompt: str,
    section_id: int,
    section_title: str,
) -> str:
    """Strengthen the section-boundary rules before handing control to the MCP agent."""
    return "\n\n".join(
        [
            system_prompt,
            "\n".join(
                [
                    "MCP operating rules for this chat:",
                    f"- The active section is fixed: #{section_id} ({section_title}).",
                    "- The section has already been identified. Never use tools to guess which section or document the user means.",
                    "- Answer from the provided section knowledge first.",
                    "- Only call tools when the user explicitly asks for MCP or external lookup, or when the provided section knowledge is insufficient.",
                    "- Do not use recent-document, global document, or reading-history tools just to reconstruct context for this section.",
                    "- Exception: If the user asks about their own writing, articles they have written, or their personal content history, you may use global document search tools to answer about their personal creations.",
                    "- When using tools, first consider if the question is about the current section content or about the user's personal writing history across all sections.",
                    "- If the question is about the current section (e.g., 'what does this section say about X'), limit tool usage to the current section's context.",
                    "- If the question is about the user's personal writing (e.g., 'have I written about X', 'what articles have I written on Y'), you may use global search tools.",
                    "- Always clarify the scope of your answer: mention whether you're answering based on the current section or the user's entire writing history.",
                ]
            ),
        ]
    )


def _build_section_agent_query(
    *,
    query: str,
    section_id: int,
    section_title: str,
) -> str:
    """Wrap the live user query so MCP sees the fixed section boundary before reasoning."""
    return "\n".join(
        [
            f"Current section: #{section_id} ({section_title})",
            "The user's request may be about the current section above, or about their personal writing history.",
            "If the question is about the current section (e.g., 'what does this section say about X'), answer from the provided section context first.",
            "If the question is about the user's personal writing (e.g., 'have I written about X', 'what articles have I written on Y'), you may use global search tools to answer about their personal creations.",
            "Do not use tools to identify which section or document the user means if it's already clear from context.",
            "Only call tools when the user explicitly asks for MCP or external lookup, or when the provided knowledge is insufficient.",
            "",
            f"User request: {query}",
        ]
    )


def _apply_section_agent_system_prompt(
    *,
    agent: MCPAgent,
    system_prompt: str,
    section_id: int,
    section_title: str,
) -> None:
    """Install section-scoped system instructions on the MCP agent itself."""
    section_system_prompt = _build_section_agent_system_prompt(
        system_prompt=system_prompt,
        section_id=section_id,
        section_title=section_title,
    )
    agent.system_prompt = section_system_prompt
    agent._system_message = SystemMessage(content=section_system_prompt)

    # Rebuild the executor when the agent was already initialized so the new
    # section prompt is guaranteed to take effect for the current stream.
    if getattr(agent, "_initialized", False):
        agent._agent_executor = agent._create_agent()


async def _build_section_context(
    *,
    db: AsyncSession,
    section_id: int,
    viewer_user_id: int,
    question: str,
    response_language_instruction: str,
) -> tuple[models.section.Section, str, list[dict[str, Any]]]:
    """Assemble section-scoped prompt context from markdown, vector hits, and graph expansion."""
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_users = await crud.section.get_users_for_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_publish_section is None:
        ensure_private_section_access(
            user_id=viewer_user_id,
            member_user_ids=[db_user.id for db_user in db_users],
        )

    section_markdown = await get_markdown_content_by_section_id(
        section_id=section_id,
        user_id=db_section.creator_id,
        allow_missing=True,
    )
    section_markdown_excerpt = (
        _truncate_text(section_markdown, SECTION_MARKDOWN_LIMIT)
        if section_markdown
        else ""
    )

    db_documents = await crud.section.get_documents_for_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    document_ids = [int(document.id) for document in db_documents]

    embedding_tasks = await crud.task.get_document_embedding_tasks_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    embedded_document_ids = [
        int(task.document_id)
        for task in embedding_tasks
        if task.status == DocumentEmbeddingStatus.SUCCESS
    ]

    summarize_tasks = await crud.task.get_document_summarize_tasks_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    summaries_by_document_id = {
        int(task.document_id): task.summary
        for task in summarize_tasks
        if task.status == DocumentSummarizeStatus.SUCCESS and task.summary
    }

    documents_by_id = {
        int(document.id): document
        for document in db_documents
    }
    # 首轮仍然使用向量召回，保证用户问题和专栏文档内容的语义匹配优先成立。
    vector_hits = naive_search_for_documents(
        search_text=question,
        document_ids=embedded_document_ids,
        top_k=SECTION_TOP_K,
    )

    chunk_citations: list[dict[str, Any]] = []
    vector_context_blocks: list[str] = []
    seen_chunk_ids: set[str] = set()
    for index, hit in enumerate(vector_hits, start=1):
        chunk_id = str(hit.get("chunk_id") or "")
        if not chunk_id or chunk_id in seen_chunk_ids:
            continue
        seen_chunk_ids.add(chunk_id)

        document_id = _coerce_int(hit.get("doc_id"))
        if document_id is None:
            continue
        db_document = documents_by_id.get(document_id)
        if db_document is None:
            continue

        excerpt = _truncate_text(
            _sanitize_chunk_citation_excerpt(str(hit.get("text") or "")),
            SECTION_REFERENCE_EXCERPT_LIMIT,
        )
        chunk_citations.append(
            _serialize_chunk_citation(
                document_id=document_id,
                document_title=db_document.title,
                chunk_id=chunk_id,
                excerpt=excerpt,
                score=hit.get("score"),
            )
        )
        vector_context_blocks.append(
            "\n".join(
                [
                    f"[Reference {index}]",
                    f"Document ID: {document_id}",
                    f"Document Title: {db_document.title}",
                    f"Excerpt: {excerpt}",
                ]
            )
        )

    graph_context_blocks: list[str] = []
    graph_entity_blocks: list[str] = []
    graph_seed_chunk_ids = [
        str(hit.get("chunk_id") or "")
        for hit in vector_hits
        if hit.get("chunk_id")
    ]
    if document_ids and graph_seed_chunk_ids:
        try:
            # 图扩展只在当前专栏关联文档范围内做，避免把全局图里的无关内容捞进来。
            graph_result = section_graph_search(
                document_ids=document_ids,
                seed_chunk_ids=graph_seed_chunk_ids,
                expand_limit=SECTION_GRAPH_TOP_K,
                entity_limit=SECTION_GRAPH_ENTITY_LIMIT,
                entity_label_limit=SECTION_GRAPH_ENTITY_LABEL_LIMIT,
            )
        except Exception as e:
            # Neo4j 是增强链路，不应该因为图检索异常把专栏问答整体打断。
            exception_logger.warning(
                format_log_message(
                    "section_graph_context_expand_failed",
                    section_id=section_id,
                    user_id=viewer_user_id,
                    error=e,
                ),
                exc_info=True,
            )
        else:
            for entity in graph_result.get("entities") or []:
                entity_text = _normalize_whitespace(str(entity.get("text") or ""))
                if not entity_text:
                    continue
                mention_count = _coerce_int(entity.get("mention_count")) or 0
                doc_scope = entity.get("document_ids") or []
                doc_scope_count = len(doc_scope) if isinstance(doc_scope, list) else 0
                entity_line = f"- {entity_text}"
                if mention_count > 0:
                    entity_line += f" ({mention_count} chunks"
                    if doc_scope_count > 0:
                        entity_line += f" / {doc_scope_count} docs"
                    entity_line += ")"
                graph_entity_blocks.append(entity_line)

            reference_index = len(vector_context_blocks) + 1
            for hit in graph_result.get("expanded_chunks") or []:
                chunk_id = str(hit.get("chunk_id") or "")
                if not chunk_id or chunk_id in seen_chunk_ids:
                    continue
                # 统一去重，避免同一 chunk 同时出现在向量召回和图扩展里。
                seen_chunk_ids.add(chunk_id)

                document_id = _coerce_int(hit.get("doc_id"))
                if document_id is None:
                    continue
                db_document = documents_by_id.get(document_id)
                if db_document is None:
                    continue

                excerpt = _truncate_text(
                    _sanitize_chunk_citation_excerpt(str(hit.get("text") or "")),
                    SECTION_REFERENCE_EXCERPT_LIMIT,
                )
                chunk_citations.append(
                    _serialize_chunk_citation(
                        document_id=document_id,
                        document_title=db_document.title,
                        chunk_id=chunk_id,
                        excerpt=excerpt,
                        score=None,
                    )
                )

                entity_texts = [
                    _normalize_whitespace(str(text))
                    for text in (hit.get("entity_texts") or [])
                    if _normalize_whitespace(str(text))
                ][:SECTION_GRAPH_ENTITY_LABEL_LIMIT]
                graph_block_lines = [
                    f"[Reference {reference_index}]",
                    f"Document ID: {document_id}",
                    f"Document Title: {db_document.title}",
                ]
                if entity_texts:
                    # 把触发图扩展的实体线索一并喂给模型，便于回答时说明关联依据。
                    graph_block_lines.append(
                        f"Graph Link: {', '.join(entity_texts)}"
                    )
                graph_block_lines.append(f"Excerpt: {excerpt}")
                graph_context_blocks.append("\n".join(graph_block_lines))
                reference_index += 1

    document_catalog_blocks: list[str] = []
    for db_document in db_documents[:SECTION_MAX_DOCUMENT_CATALOG]:
        summary = summaries_by_document_id.get(int(db_document.id))
        fallback_summary = summary or db_document.description or ""
        document_catalog_blocks.append(
            "\n".join(
                [
                    f"- Document ID: {db_document.id}",
                    f"  Title: {db_document.title}",
                    f"  Summary: {_truncate_text(fallback_summary, SECTION_DOCUMENT_SUMMARY_LIMIT) if fallback_summary else 'N/A'}",
                ]
            )
        )

    context_blocks: list[str] = [
        f"Section Title: {db_section.title}",
        f"Section Description: {db_section.description or 'N/A'}",
    ]
    if section_markdown_excerpt:
        context_blocks.extend(
            [
                "Section Markdown:",
                section_markdown_excerpt,
            ]
        )
    if vector_context_blocks:
        context_blocks.extend(
            [
                "Relevant Document Excerpts:",
                "\n\n".join(vector_context_blocks),
            ]
        )
    if graph_entity_blocks:
        context_blocks.extend(
            [
                "Entity Graph Signals:",
                "\n".join(graph_entity_blocks),
            ]
        )
    if graph_context_blocks:
        context_blocks.extend(
            [
                "Graph-Expanded Document Excerpts:",
                "\n\n".join(graph_context_blocks),
            ]
        )
    if document_catalog_blocks:
        context_blocks.extend(
            [
                "Related Documents:",
                "\n".join(document_catalog_blocks),
            ]
        )

    context = "\n\n".join(block for block in context_blocks if block)
    if not context.strip():
        raise schemas.error.CustomException(
            "No section knowledge is available for AI Q&A yet",
            code=400,
        )

    system_prompt = "\n".join(
        [
            "You are Revornix AI, answering questions about a single section.",
            "Use only the provided section knowledge, related document excerpts, and entity graph signals.",
            "If the context is insufficient, explicitly say that you do not know.",
            "Do not invent facts that are not grounded in the provided context.",
            response_language_instruction,
            "",
            "Section knowledge:",
            context,
        ]
    )
    return db_section.id, db_section.title, system_prompt, chunk_citations


async def _stream_section_answer_with_agent(
    *,
    section_id: int,
    section_title: str,
    user: models.user.User,
    model_id: int,
    system_prompt: str,
    messages: list[schemas.ai.ChatItem],
    chunk_citations: list[dict[str, Any]],
    agent: MCPAgent,
):
    """Stream a section-scoped answer through the MCP agent event pipeline."""
    interpreter = EventInterpreter()
    usage_collector = UsageCollector()
    chat_id = uuid4().hex
    query = ""
    stream_failed = False
    emitted_text_output = False

    try:
        agent.clear_conversation_history()
        _apply_section_agent_system_prompt(
            agent=agent,
            system_prompt=system_prompt,
            section_id=section_id,
            section_title=section_title,
        )

        query = messages[-1].content
        for message in messages[:-1]:
            if message.role == "user":
                agent.add_to_history(
                    await _build_human_message_with_images(
                        user_id=user.id,
                        text=message.content,
                        image_paths=message.images,
                    )
                )
            elif message.role == "assistant":
                agent.add_to_history(AIMessage(content=message.content))

        query_message = await _build_human_message_with_images(
            user_id=user.id,
            text=_build_section_agent_query(
                query=query,
                section_id=section_id,
                section_title=section_title,
            ),
            image_paths=messages[-1].images,
        )

        with propagate_attributes(
            user_id=str(user.id),
            tags=[f"model:{agent._model_name}", f"section:{section_id}"],
        ):
            async for raw_event in agent.stream_events(query=query_message):
                raw_event_dict = dict(raw_event)
                if raw_event_dict.get("event") == "on_chat_model_end":
                    usage_collector.collect(raw_event_dict)

                for interpreted in interpreter.interpret(
                    event=raw_event_dict,
                    chat_id=chat_id,
                ):
                    if not interpreted:
                        continue
                    if (
                        interpreted.get("type") == "output"
                        and isinstance(interpreted.get("payload"), dict)
                        and interpreted["payload"].get("kind") == "token"
                        and interpreted["payload"].get("content")
                    ):
                        emitted_text_output = True
                    yield _sse(interpreted)
    except Exception as e:
        stream_failed = True
        exception_logger.error(
            format_log_message(
                "section_ai_stream_failed",
                section_id=section_id,
                user_id=user.id,
                error=e,
            ),
            exc_info=True,
        )
        usage_snapshot = usage_collector.snapshot()
        is_recursion_limit = _is_graph_recursion_limit_error(e)

        if is_recursion_limit:
            yield _sse(
                {
                    "chat_id": chat_id,
                    "type": "output",
                    "timestamp": time.time(),
                    "trace": {},
                    "payload": {
                        "kind": "system_text",
                        "message": _build_mcp_recursion_limit_notice_key(
                            has_partial_answer=emitted_text_output,
                        ),
                        "paragraph_break": emitted_text_output,
                    },
                }
            )

        payload: dict[str, Any] = {
            "code": "MCP_RECURSION_LIMIT" if is_recursion_limit else "SERVER_ERROR",
            "message": _build_agent_error_message_key(
                is_recursion_limit=is_recursion_limit,
            ),
        }
        if usage_snapshot is not None:
            payload["usage"] = usage_snapshot

        yield _sse(
            {
                "chat_id": chat_id,
                "type": "error",
                "timestamp": time.time(),
                "trace": {},
                "payload": payload,
            }
        )
        return

    usage_snapshot = usage_collector.snapshot()
    if usage_snapshot is not None:
        persist_model_usage_from_snapshot(
            user_id=user.id,
            model_id=model_id,
            snapshot=usage_snapshot,
            source="section_ask_stream",
            idempotency_key=f"section_ask:{chat_id}",
        )

    if stream_failed:
        return

    if chunk_citations:
        yield _sse(
            base_event(
                chat_id=chat_id,
                event_type="artifact",
                trace={},
                payload={
                    "kind": "chunk_citations",
                    "items": chunk_citations,
                },
            )
        )

    yield _sse(
        {
            "chat_id": chat_id,
            "type": "done",
            "timestamp": time.time(),
            "trace": {},
            "payload": {
                "success": True,
                "section_id": section_id,
                "section_title": section_title,
                "usage": usage_snapshot.get("usage") if usage_snapshot else None,
            },
        }
    )


@section_ai_router.post("/ask")
async def ask_section_ai(
    section_ask_request: schemas.section.SectionAskRequest,
    user: models.user.User = Depends(get_current_user_short_lived),
):
    """Handle section AI chat requests through the shared MCP agent pipeline."""
    if user.default_revornix_model_id is None:
        raise schemas.error.CustomException(
            "The user has not set a default model",
            code=400,
        )

    messages = [
        message
        for message in section_ask_request.messages
        if message.role in {"user", "assistant"}
    ]
    if not messages:
        raise schemas.error.CustomException("Messages cannot be empty", code=400)
    if messages[-1].role != "user":
        raise schemas.error.CustomException(
            "The latest message must be from the user",
            code=400,
        )
    if not messages[-1].content.strip() and not _normalize_chat_images(messages[-1].images):
        raise schemas.error.CustomException(
            "The latest message must include text or images",
            code=400,
        )

    async with async_session_context() as db:
        section_id, section_title, system_prompt, chunk_citations = await _build_section_context(
            db=db,
            section_id=section_ask_request.section_id,
            viewer_user_id=user.id,
            question=messages[-1].content,
            response_language_instruction=_build_ai_language_instruction(
                user.default_ai_interaction_language,
            ),
        )

    try:
        agent, model_id = await create_agent(
            user_id=user.id,
            enable_mcp=section_ask_request.enable_mcp,
            model_id=section_ask_request.model_id,
        )
    except Exception as e:
        raise schemas.error.CustomException(message=str(e), code=400) from e

    return StreamingResponse(
        _stream_section_answer_with_agent(
            section_id=section_id,
            section_title=section_title,
            user=user,
            model_id=model_id,
            system_prompt=system_prompt,
            messages=messages,
            chunk_citations=chunk_citations,
            agent=agent,
        ),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
