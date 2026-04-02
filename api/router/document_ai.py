import json
import time
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, SystemMessage
from langfuse import propagate_attributes
from mcp_use import MCPAgent
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from common.interpret_event import EventInterpreter
from common.logger import exception_logger, format_log_message
from common.markdown_helpers import get_markdown_content_by_document_id
from common.usage_billing import persist_model_usage_from_snapshot
from common.usage_collector import UsageCollector
from data.milvus.search import naive_search_for_documents
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
from router.logic_helpers import ensure_document_access

document_ai_router = APIRouter()

DOCUMENT_MARKDOWN_LIMIT = 7000
DOCUMENT_REFERENCE_EXCERPT_LIMIT = 220
DOCUMENT_TOP_K = 6
DOCUMENT_SUMMARY_LIMIT = 320


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _normalize_whitespace(text: str) -> str:
    return " ".join(text.split()).strip()


def _truncate_text(text: str, limit: int) -> str:
    normalized = _normalize_whitespace(text)
    if len(normalized) <= limit:
        return normalized
    return normalized[: max(0, limit - 1)].rstrip() + "…"


def _sanitize_chunk_citation_excerpt(text: str) -> str:
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


def _serialize_chunk_citation(
    *,
    document_id: int,
    document_title: str,
    chunk_id: str,
    excerpt: str,
    score: float | None,
) -> dict[str, Any]:
    return schemas.section.SectionAskChunkCitation(
        document_id=document_id,
        document_title=document_title,
        chunk_id=chunk_id,
        excerpt=excerpt,
        score=score,
    ).model_dump()


def _ensure_document_ai_access(
    *,
    db: Session,
    document_id: int,
    document_creator_id: int,
    user_id: int,
) -> None:
    if document_creator_id == user_id:
        return

    db_published_section_documents = (
        crud.document.get_published_section_of_the_document_by_document_id(
            db=db,
            document_id=document_id,
        )
    )
    if db_published_section_documents:
        return

    db_user_published_section_documents = (
        crud.document.get_published_section_of_the_document_by_document_id(
            db=db,
            document_id=document_id,
            user_id=user_id,
        )
    )
    ensure_document_access(
        is_creator=False,
        has_public_section=bool(db_published_section_documents),
        has_related_section=bool(db_user_published_section_documents),
    )


def _build_document_agent_system_prompt(
    *,
    system_prompt: str,
    document_id: int,
    document_title: str,
) -> str:
    return "\n\n".join(
        [
            system_prompt,
            "\n".join(
                [
                    "MCP operating rules for this chat:",
                    f"- The active document is fixed: #{document_id} ({document_title}).",
                    "- The document has already been identified. Never use tools to guess which document the user means.",
                    "- Answer from the provided document knowledge first.",
                    "- Only call tools when the user explicitly asks for MCP or external lookup, or when the provided document knowledge is insufficient.",
                    "- Do not use recent-document, global document, or reading-history tools just to reconstruct the current document.",
                    "- If you answer beyond the current document, explicitly say that you are expanding scope.",
                ]
            ),
        ]
    )


def _build_document_agent_query(
    *,
    query: str,
    document_id: int,
    document_title: str,
) -> str:
    return "\n".join(
        [
            f"Current document: #{document_id} ({document_title})",
            "Answer from the current document knowledge first.",
            "Only call tools when the user explicitly asks for MCP or external lookup, or when the provided knowledge is insufficient.",
            "Do not use tools to identify which document the user means if it is already clear from context.",
            "",
            f"User request: {query}",
        ]
    )


def _apply_document_agent_system_prompt(
    *,
    agent: MCPAgent,
    system_prompt: str,
    document_id: int,
    document_title: str,
) -> None:
    document_system_prompt = _build_document_agent_system_prompt(
        system_prompt=system_prompt,
        document_id=document_id,
        document_title=document_title,
    )
    agent.system_prompt = document_system_prompt
    agent._system_message = SystemMessage(content=document_system_prompt)

    if getattr(agent, "_initialized", False):
        agent._agent_executor = agent._create_agent()


async def _build_document_context(
    *,
    db: Session,
    document_id: int,
    viewer_user_id: int,
    question: str,
    response_language_instruction: str,
) -> tuple[models.document.Document, str, list[dict[str, Any]]]:
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    _ensure_document_ai_access(
        db=db,
        document_id=document_id,
        document_creator_id=db_document.creator_id,
        user_id=viewer_user_id,
    )

    markdown_content = await get_markdown_content_by_document_id(
        document_id=document_id,
        user_id=db_document.creator_id,
    )
    markdown_excerpt = _truncate_text(markdown_content, DOCUMENT_MARKDOWN_LIMIT)

    summarize_task = crud.task.get_document_summarize_task_by_document_id(
        db=db,
        document_id=document_id,
    )
    summary = (
        summarize_task.summary
        if summarize_task is not None
        and summarize_task.status == DocumentSummarizeStatus.SUCCESS
        and summarize_task.summary
        else None
    )

    chunk_citations: list[dict[str, Any]] = []
    vector_context_blocks: list[str] = []
    embedding_task = crud.task.get_document_embedding_task_by_document_id(
        db=db,
        document_id=document_id,
    )
    if (
        embedding_task is not None
        and embedding_task.status == DocumentEmbeddingStatus.SUCCESS
    ):
        vector_hits = naive_search_for_documents(
            search_text=question,
            document_ids=[document_id],
            top_k=DOCUMENT_TOP_K,
        )
        seen_chunk_ids: set[str] = set()
        for index, hit in enumerate(vector_hits, start=1):
            chunk_id = str(hit.get("chunk_id") or "")
            if not chunk_id or chunk_id in seen_chunk_ids:
                continue
            seen_chunk_ids.add(chunk_id)

            excerpt = _truncate_text(
                _sanitize_chunk_citation_excerpt(str(hit.get("text") or "")),
                DOCUMENT_REFERENCE_EXCERPT_LIMIT,
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

    context_blocks: list[str] = [
        f"Document Title: {db_document.title}",
        f"Document Description: {db_document.description or 'N/A'}",
    ]
    if summary:
        context_blocks.extend(
            [
                "Document Summary:",
                _truncate_text(summary, DOCUMENT_SUMMARY_LIMIT),
            ]
        )
    if markdown_excerpt:
        context_blocks.extend(
            [
                "Document Content:",
                markdown_excerpt,
            ]
        )
    if vector_context_blocks:
        context_blocks.extend(
            [
                "Relevant Document Excerpts:",
                "\n\n".join(vector_context_blocks),
            ]
        )

    context = "\n\n".join(block for block in context_blocks if block)
    if not context.strip():
        raise schemas.error.CustomException(
            "No document knowledge is available for AI Q&A yet",
            code=400,
        )

    system_prompt = "\n".join(
        [
            "You are Revornix AI, answering questions about a single document.",
            "Use only the provided document knowledge and excerpts.",
            "If the context is insufficient, explicitly say that you do not know.",
            "Do not invent facts that are not grounded in the provided context.",
            response_language_instruction,
            "",
            "Document knowledge:",
            context,
        ]
    )
    return db_document, system_prompt, chunk_citations


async def _stream_document_answer_with_agent(
    *,
    document_id: int,
    document_title: str,
    user: models.user.User,
    model_id: int,
    system_prompt: str,
    messages: list[schemas.ai.ChatItem],
    chunk_citations: list[dict[str, Any]],
    agent: MCPAgent,
):
    interpreter = EventInterpreter()
    usage_collector = UsageCollector()
    chat_id = uuid4().hex
    stream_failed = False
    emitted_text_output = False

    try:
        agent.clear_conversation_history()
        _apply_document_agent_system_prompt(
            agent=agent,
            system_prompt=system_prompt,
            document_id=document_id,
            document_title=document_title,
        )

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
            text=_build_document_agent_query(
                query=messages[-1].content,
                document_id=document_id,
                document_title=document_title,
            ),
            image_paths=messages[-1].images,
        )

        with propagate_attributes(
            user_id=str(user.id),
            tags=[f"model:{agent._model_name}", f"document:{document_id}"],
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
                "document_ai_stream_failed",
                document_id=document_id,
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
            source="document_ask_stream",
            idempotency_key=f"document_ask:{chat_id}",
        )

    if stream_failed:
        return

    if chunk_citations:
        yield _sse(
            {
                "chat_id": chat_id,
                "type": "artifact",
                "timestamp": time.time(),
                "trace": {},
                "payload": {
                    "kind": "chunk_citations",
                    "items": chunk_citations,
                },
            }
        )

    yield _sse(
        {
            "chat_id": chat_id,
            "type": "done",
            "timestamp": time.time(),
            "trace": {},
            "payload": {
                "success": True,
                "document_id": document_id,
                "document_title": document_title,
                "usage": usage_snapshot.get("usage") if usage_snapshot else None,
            },
        }
    )


@document_ai_router.post("/ask")
async def ask_document_ai(
    document_ask_request: schemas.document.DocumentAskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    if user.default_revornix_model_id is None:
        raise schemas.error.CustomException(
            "The user has not set a default model",
            code=400,
        )

    messages = [
        message
        for message in document_ask_request.messages
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

    db_document, system_prompt, chunk_citations = await _build_document_context(
        db=db,
        document_id=document_ask_request.document_id,
        viewer_user_id=user.id,
        question=messages[-1].content,
        response_language_instruction=_build_ai_language_instruction(
            user.default_ai_interaction_language,
        ),
    )

    try:
        agent, model_id = await create_agent(
            user_id=user.id,
            enable_mcp=document_ask_request.enable_mcp,
        )
    except Exception as e:
        raise schemas.error.CustomException(message=str(e), code=400) from e

    return StreamingResponse(
        _stream_document_answer_with_agent(
            document_id=db_document.id,
            document_title=db_document.title,
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
