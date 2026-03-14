from __future__ import annotations

import json
import time
import uuid
from collections.abc import Iterable
from typing import Any

DOCUMENT_REFERENCE_LIMIT = 6
DOCUMENT_LIST_TOOL_NAMES = {
    "search_my_documents",
    "search_my_unread_documents",
    "search_my_recent_documents",
    "search_my_starred_documents",
}
DOCUMENT_VECTOR_TOOL_NAMES = {
    "search_document_vector",
}
DOCUMENT_DETAIL_TOOL_NAMES = {
    "get_document_detail",
}

def now_ts() -> float:
    """Return the current timestamp for outbound stream events."""
    return time.time()


def gen_event_id() -> str:
    """Create a unique event id for downstream correlation when needed."""
    return f"evt_{uuid.uuid4().hex}"


def base_event(
    event_type: str,
    chat_id: str,
    payload: dict[str, Any],
    trace: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the normalized event envelope consumed by the frontend."""
    return {
        "chat_id": chat_id,
        "type": event_type,          # status | output | artifact | error | done
        "timestamp": now_ts(),
        "trace": trace or {},
        "payload": payload,
    }


def _extract_tool_text_fragments(content: Any) -> list[str]:
    """Normalize heterogeneous MCP tool outputs into plain text fragments."""
    if content is None:
        return []
    if isinstance(content, str):
        return [content]
    if isinstance(content, list):
        fragments: list[str] = []
        for item in content:
            fragments.extend(_extract_tool_text_fragments(item))
        return fragments
    if isinstance(content, dict):
        content_blocks = content.get("content_blocks")
        if isinstance(content_blocks, list):
            return _extract_tool_text_fragments(content_blocks)
        text = content.get("text")
        if isinstance(text, str):
            return [text]
        resource = content.get("resource")
        if isinstance(resource, dict):
            resource_uri = resource.get("uri")
            if isinstance(resource_uri, str):
                return [f"[resource: {resource_uri}]"]
        nested_content = content.get("content")
        if nested_content is not None:
            return _extract_tool_text_fragments(nested_content)
        return [json.dumps(content, ensure_ascii=False)]

    text_attr = getattr(content, "text", None)
    if isinstance(text_attr, str):
        return [text_attr]

    nested_content_attr = getattr(content, "content", None)
    if nested_content_attr is not None:
        return _extract_tool_text_fragments(nested_content_attr)

    return [str(content)]


def _strip_markdown_code_fence(text: str) -> str:
    """Remove markdown code fences so JSON-like tool payloads can be parsed."""
    stripped = text.strip()
    if stripped.startswith("```") and stripped.endswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return stripped


def _extract_json_candidates(text: str) -> list[str]:
    """Extract direct JSON candidates from structured tool text fragments."""
    candidate = _strip_markdown_code_fence(text)
    return [candidate] if candidate else []


def _parse_tool_payloads(content: Any) -> list[Any]:
    """Parse JSON-like tool outputs into Python objects when possible."""
    payloads: list[Any] = []
    for fragment in _extract_tool_text_fragments(content):
        for candidate in _extract_json_candidates(fragment):
            try:
                payloads.append(json.loads(candidate))
            except json.JSONDecodeError:
                continue
    return payloads


def _extract_tool_artifact(output: Any) -> Any:
    """Return the structured artifact attached to a LangChain ToolMessage when available."""
    artifact = getattr(output, "artifact", None)
    if artifact is not None:
        return artifact
    return output


def _coerce_int(value: Any) -> int | None:
    """Safely coerce loose identifiers into integers."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_section_titles(record: dict[str, Any]) -> list[str]:
    """Extract section titles from a document payload using the declared section schema."""
    section_titles: list[str] = []
    sections = record.get("sections")
    if not isinstance(sections, list):
        return section_titles

    for section in sections:
        if not isinstance(section, dict):
            continue
        section_id = _coerce_int(section.get("id"))
        section_title = section.get("title")
        if section_id is None or not isinstance(section_title, str) or not section_title.strip():
            continue
        section_titles.append(section_title.strip())
    return section_titles


def _parse_document_summary_record(record: Any) -> dict[str, Any] | None:
    """Validate a document-summary payload against the DocumentInfo contract."""
    if not isinstance(record, dict):
        return None

    document_id = _coerce_int(record.get("id"))
    creator_id = _coerce_int(record.get("creator_id"))
    category = _coerce_int(record.get("category"))
    title = record.get("title")
    from_plat = record.get("from_plat")
    if document_id is None or creator_id is None or category is None:
        return None
    if not isinstance(title, str) or not title.strip():
        return None
    if not isinstance(from_plat, str) or not from_plat.strip():
        return None

    description = record.get("description")
    return {
        "document_id": document_id,
        "document_title": title.strip(),
        "description": description.strip() if isinstance(description, str) and description.strip() else None,
        "section_titles": _extract_section_titles(record)[:3],
    }


def _parse_document_detail_record(record: Any) -> dict[str, Any] | None:
    """Validate a document-detail payload against the DocumentDetailResponse contract."""
    if not isinstance(record, dict):
        return None

    document_id = _coerce_int(record.get("id"))
    category = _coerce_int(record.get("category"))
    title = record.get("title")
    from_plat = record.get("from_plat")
    creator = record.get("creator")
    if document_id is None or category is None:
        return None
    if not isinstance(title, str) or not title.strip():
        return None
    if not isinstance(from_plat, str) or not from_plat.strip():
        return None
    if not isinstance(creator, dict) or _coerce_int(creator.get("id")) is None:
        return None

    description = record.get("description")
    return {
        "document_id": document_id,
        "document_title": title.strip(),
        "description": description.strip() if isinstance(description, str) and description.strip() else None,
        "section_titles": _extract_section_titles(record)[:3],
    }


def _extract_document_records_from_payload(tool_name: str, payload: Any) -> list[dict[str, Any]]:
    """Extract document sources only from MCP tools with explicit document payload contracts."""
    if tool_name in DOCUMENT_LIST_TOOL_NAMES:
        if not isinstance(payload, dict):
            return []
        elements = payload.get("elements")
        if not isinstance(elements, list):
            return []
        return [
            parsed
            for record in elements
            if (parsed := _parse_document_summary_record(record)) is not None
        ]

    if tool_name in DOCUMENT_VECTOR_TOOL_NAMES:
        if not isinstance(payload, dict):
            return []
        documents = payload.get("documents")
        if not isinstance(documents, list):
            return []
        return [
            parsed
            for record in documents
            if (parsed := _parse_document_summary_record(record)) is not None
        ]

    if tool_name in DOCUMENT_DETAIL_TOOL_NAMES:
        parsed = _parse_document_detail_record(payload)
        return [parsed] if parsed is not None else []

    return []


def _build_document_sources(tool_name: str, content: Any) -> list[dict[str, Any]]:
    """Extract compact document sources from explicit document-tool payloads."""
    document_sources: list[dict[str, Any]] = []
    seen_document_ids: set[int] = set()

    for payload in _parse_tool_payloads(content):
        for source in _extract_document_records_from_payload(tool_name, payload):
            document_id = source["document_id"]
            if document_id in seen_document_ids:
                continue
            document_sources.append({**source, "source_tool": tool_name})
            seen_document_ids.add(document_id)

            if len(document_sources) >= DOCUMENT_REFERENCE_LIMIT:
                return document_sources

    return document_sources


def _build_tool_result_preview(tool_name: str, content: Any, document_sources: list[dict[str, Any]]) -> str:
    """Create a compact preview string so tool-result payloads stay lightweight."""
    if document_sources:
        if len(document_sources) == 1:
            return f'{tool_name}: {document_sources[0]["document_title"]}'
        return f"{tool_name}: {len(document_sources)} documents"

    text = " ".join(
        fragment.strip()
        for fragment in _extract_tool_text_fragments(content)
        if isinstance(fragment, str) and fragment.strip()
    )
    normalized = " ".join(text.split())
    if len(normalized) <= 180:
        return normalized
    return normalized[:179].rstrip() + "…"


# ==========================
# EventInterpreter（生产级）
# ==========================

class EventInterpreter:
    """
    LangGraph / MCP → 前端可消费事件（AESP）
    """

    def __init__(self):
        """Initialize interpreter state used to debounce repeated status events."""
        self._last_status: str | None = None
        self._done_sent: bool = False

    # ========= 主入口 =========
    def interpret(
        self,
        chat_id: str,
        event: dict[str, Any]
    ) -> Iterable[dict[str, Any]]:
        """Translate LangGraph and MCP events into the normalized frontend event stream."""
        event_type = event.get("event")
        name = event.get("name")
        data = event.get("data", {}) or {}
        parent_ids = event.get("parent_ids", [])

        # trace 信息（给前端 / 调试用）
        trace = {
            "node": name,
            "parent_ids": parent_ids,
        }

        is_root = not parent_ids

        # =========================
        # 1️⃣ Chain Start
        # =========================
        if event_type == "on_chain_start":
            if is_root:
                evt = self._status_once(
                    chat_id=chat_id,
                    trace=trace,
                    phase="thinking",
                    label="正在理解你的问题",
                )
                if evt:
                    yield evt
            return

        # =========================
        # 2️⃣ Chain Stream（忽略）
        # =========================
        if event_type == "on_chain_stream":
            return

        # =========================
        # 3️⃣ Chat Model Start
        # =========================
        if event_type == "on_chat_model_start":
            evt = self._status_once(
                chat_id=chat_id,
                trace=trace,
                phase="writing",
                label="正在生成回答",
            )
            if evt:
                yield evt
            return

        # =========================
        # 4️⃣ Chat Model Token
        # =========================
        if event_type == "on_chat_model_stream":
            chunk = data.get("chunk")

            # LangChain 有时是 AIMessageChunk
            if chunk is not None and hasattr(chunk, "content"):
                content = chunk.content
            else:
                content = chunk

            if isinstance(content, str) and content:
                yield base_event(
                    chat_id=chat_id,
                    event_type="output",
                    trace=trace,
                    payload={
                        "kind": "token",
                        "content": content,
                    },
                )
            return

        # =========================
        # 5️⃣ Chat Model End（不发事件）
        # =========================
        if event_type == "on_chat_model_end":
            return

        # =========================
        # 6️⃣ Tool Start
        # =========================
        if event_type == "on_tool_start":
            tool_name = name or "tool"
            evt = self._status_once(
                chat_id=chat_id,
                trace=trace,
                phase="tool",
                label=f"正在调用工具：{tool_name}",
                detail={"tool": tool_name},
            )
            if evt:
                yield evt
            return

        # =========================
        # 7️⃣ Tool End
        # =========================
        if event_type == "on_tool_end":
            output = data.get("output")

            if output is not None and hasattr(output, "content"):
                content = output.content
            else:
                content = output

            tool_name = name or "tool"
            tool_payload = _extract_tool_artifact(output)
            document_sources = _build_document_sources(tool_name, tool_payload)
            preview = _build_tool_result_preview(tool_name, content, document_sources)

            # 1️⃣ 先发工具执行痕迹，再发结构化来源，避免把来源语义塞进 output 事件。
            if preview or document_sources:
                yield base_event(
                    chat_id=chat_id,
                    event_type="artifact",
                    trace=trace,
                    payload={
                        "kind": "tool_result",
                        "tool": tool_name,
                        "content": preview,
                    },
                )

            if document_sources:
                yield base_event(
                    chat_id=chat_id,
                    event_type="artifact",
                    trace=trace,
                    payload={
                        "kind": "document_sources",
                        "items": document_sources,
                    },
                )

            # 2️⃣ 再切回 thinking 状态
            evt = self._status_once(
                chat_id=chat_id,
                trace=trace,
                phase="thinking",
                label="工具返回结果，继续思考",
            )
            if evt:
                yield evt

            return

        # =========================
        # 8️⃣ Chain End（只处理 root）
        # =========================
        if event_type == "on_chain_end":
            if is_root and not self._done_sent:
                self._done_sent = True
                yield base_event(
                    chat_id=chat_id,
                    event_type="done",
                    trace=trace,
                    payload={"success": True},
                )
            return

        # =========================
        # 9️⃣ Error
        # =========================
        if event_type in ("on_chain_error", "on_tool_error"):
            yield base_event(
                chat_id=chat_id,
                event_type="error",
                trace=trace,
                payload={
                    "code": "EXECUTION_ERROR",
                    "message": str(data)
                },
            )
            return

        # =========================
        # 默认忽略
        # =========================
        return

    # =========================
    # 状态去抖（关键）
    # =========================
    def _status_once(
        self,
        chat_id: str,
        trace: dict[str, Any],
        phase: str,
        label: str,
        detail: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Emit a status event only when the phase actually changes."""
        if self._last_status == phase:
            return None

        self._last_status = phase

        return base_event(
            chat_id=chat_id,
            event_type="status",
            trace=trace,
            payload={
                "phase": phase,   # thinking | writing | tool
                "label": label,
                "detail": detail or {},
            },
        )
