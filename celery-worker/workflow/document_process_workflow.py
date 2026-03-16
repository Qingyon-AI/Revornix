from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger, format_log_message, info_logger
from common.document_guard import ensure_document_active
from data.common import get_document_markdown_length
from data.sql.base import session_scope
from enums.document import (
    DocumentEmbeddingStatus,
    DocumentGraphStatus,
    DocumentPodcastStatus,
    DocumentProcessStatus,
    DocumentSummarizeStatus,
)
from schemas.task import DocumentOverrideProperty
from workflow.document_chunk_process_workflow import run_document_chunk_process_workflow
from workflow.document_convert_workflow import run_document_convert_workflow
from workflow.document_embedding_workflow import run_document_embedding_workflow
from workflow.document_podcast_workflow import run_document_podcast_workflow
from workflow.document_tag_workflow import run_document_tag_workflow
from workflow.document_transcribe_workflow import run_document_transcribe_workflow
from workflow.timing import add_timed_node, ainvoke_with_timing


class DocumentProcessState(TypedDict, total=False):
    document_id: int
    user_id: int
    auto_summary: bool
    auto_podcast: bool
    auto_transcribe: bool
    auto_tag: bool
    override: dict | DocumentOverrideProperty | None
    use_progressive_followups: bool


WORKFLOW_NAME = "document_process"
PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD = 100_000
PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT = 24
ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD = 400_000


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 3)] + "..."


async def _init_document_process_task(
    state: DocumentProcessState
) -> DocumentProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to process document has not set default user file system")
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to process document has not set default document reader model")

        db_document_process_task = crud.task.get_document_process_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document_process_task is None:
            db_document_process_task = crud.task.create_document_process_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
                status=DocumentProcessStatus.PROCESSING
            )
        else:
            if db_document_process_task.status != DocumentProcessStatus.PROCESSING:
                db_document_process_task.status = DocumentProcessStatus.PROCESSING
        db.commit()
    finally:
        db.close()
    return state


async def _maybe_transcribe_document(
    state: DocumentProcessState
) -> DocumentProcessState:
    if not state.get("auto_transcribe"):
        return state
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    await run_document_transcribe_workflow(
        document_id=document_id,
        user_id=user_id
    )
    return state


async def _convert_document(
    state: DocumentProcessState
) -> DocumentProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    await run_document_convert_workflow(
        document_id=document_id,
        user_id=user_id
    )
    return state


async def _apply_override(
    state: DocumentProcessState
) -> DocumentProcessState:
    override = state.get("override")
    if override is None:
        return state
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Document workflow missing document_id")

    override_obj = None
    if isinstance(override, DocumentOverrideProperty):
        override_obj = override
    else:
        override_obj = DocumentOverrideProperty.model_validate(override)

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if override_obj.cover is not None:
            db_document.cover = override_obj.cover
        if override_obj.title is not None:
            db_document.title = override_obj.title
        if override_obj.description is not None:
            db_document.description = override_obj.description
        db.commit()
    finally:
        db.close()
    return state


async def _maybe_tag_document(
    state: DocumentProcessState
) -> DocumentProcessState:
    if not state.get("auto_tag"):
        return state
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    await run_document_tag_workflow(
        document_id=document_id,
        user_id=user_id
    )
    return state


async def _process_document_chunks(
    state: DocumentProcessState
) -> DocumentProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    auto_summary = bool(state.get("auto_summary", False))
    auto_podcast = bool(state.get("auto_podcast", False))
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    markdown_length = await get_document_markdown_length(document_id)
    if markdown_length >= PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD:
        enable_auto_graph = markdown_length < ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD
        info_logger.info(
            f"[WorkflowTiming] progressive_document_processing_enabled "
            f"workflow={WORKFLOW_NAME}, document_id={document_id}, user_id={user_id}, "
            f"markdown_chars={markdown_length}, bootstrap_chunks={PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT}, "
            f"auto_summary={auto_summary}, auto_podcast={auto_podcast}, "
            f"enable_auto_graph={enable_auto_graph}"
        )
        await run_document_embedding_workflow(
            document_id=document_id,
            user_id=user_id,
            max_chunks=PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT,
            manage_task_status=False,
        )
        _prepare_progressive_followup_tasks(
            document_id=document_id,
            user_id=user_id,
            auto_summary=auto_summary,
            auto_podcast=auto_podcast,
            auto_graph=enable_auto_graph,
        )
        _enqueue_progressive_followup_tasks(
            document_id=document_id,
            user_id=user_id,
            auto_summary=auto_summary,
            auto_podcast=auto_podcast,
            auto_graph=enable_auto_graph,
        )
        state["use_progressive_followups"] = True
        return state

    await run_document_chunk_process_workflow(
        document_id=document_id,
        user_id=user_id,
        auto_summary=auto_summary,
    )
    state["use_progressive_followups"] = False
    return state


async def _maybe_generate_podcast(
    state: DocumentProcessState
) -> DocumentProcessState:
    if not state.get("auto_podcast"):
        return state
    if state.get("use_progressive_followups"):
        return state
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    await run_document_podcast_workflow(
        document_id=document_id,
        user_id=user_id
    )
    return state


async def _mark_process_success(
    state: DocumentProcessState
) -> DocumentProcessState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Document workflow missing document_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
        db_document_process_task = crud.task.get_document_process_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document_process_task is not None:
            db_document_process_task.status = DocumentProcessStatus.SUCCESS.value
            db.commit()
    finally:
        db.close()
    return state


def _prepare_progressive_followup_tasks(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool,
    auto_podcast: bool,
    auto_graph: bool,
) -> None:
    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)

        db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
            db=db,
            document_id=document_id,
        )
        if db_embedding_task is None:
            db_embedding_task = crud.task.create_document_embedding_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
            )
        db_embedding_task.status = DocumentEmbeddingStatus.WAIT_TO

        if auto_graph:
            db_graph_task = crud.task.get_document_graph_task_by_document_id(
                db=db,
                document_id=document_id,
            )
            if db_graph_task is None:
                db_graph_task = crud.task.create_document_graph_task(
                    db=db,
                    user_id=user_id,
                    document_id=document_id,
                )
            db_graph_task.status = DocumentGraphStatus.WAIT_TO

        if auto_summary:
            db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                db=db,
                document_id=document_id,
            )
            if db_summarize_task is None:
                db_summarize_task = crud.task.create_document_summarize_task(
                    db=db,
                    user_id=user_id,
                    document_id=document_id,
                )
            db_summarize_task.status = DocumentSummarizeStatus.WAIT_TO
            db_summarize_task.summary = None

        if auto_podcast:
            db_podcast_task = crud.task.get_document_podcast_task_by_document_id(
                db=db,
                document_id=document_id,
            )
            if db_podcast_task is None:
                db_podcast_task = crud.task.create_document_podcast_task(
                    db=db,
                    user_id=user_id,
                    document_id=document_id,
                )
            db_podcast_task.status = DocumentPodcastStatus.WAIT_TO
            db_podcast_task.podcast_file_name = None

        db.commit()
    finally:
        db.close()


def _enqueue_progressive_followup_tasks(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool,
    auto_podcast: bool,
    auto_graph: bool,
) -> None:
    from celery import chain, group
    from common.celery.app import celery_app

    followup_signatures = [
        celery_app.signature(
            "common.celery.app.start_process_document_embedding",
            kwargs={
                "document_id": document_id,
                "user_id": user_id,
                "start_chunk_idx": PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT,
            },
            immutable=True,
        ),
    ]
    if auto_graph:
        followup_signatures.append(
            celery_app.signature(
                "common.celery.app.start_process_document_graph",
                kwargs={
                    "document_id": document_id,
                    "user_id": user_id,
                },
                immutable=True,
            )
        )
    if auto_summary:
        followup_signatures.append(
            celery_app.signature(
                "common.celery.app.start_process_document_summarize",
                kwargs={
                    "document_id": document_id,
                    "user_id": user_id,
                },
                immutable=True,
            )
        )
    if auto_podcast:
        followup_signatures.append(
            celery_app.signature(
                "common.celery.app.start_process_document_podcast",
                kwargs={
                    "document_id": document_id,
                    "user_id": user_id,
                },
                immutable=True,
            )
        )
    workflow = chain(
        celery_app.signature(
            "common.celery.app.start_prepare_document_chunk_snapshot",
            kwargs={
                "document_id": document_id,
                "user_id": user_id,
            },
            immutable=True,
        ),
        group(followup_signatures),
    )
    workflow.apply_async()
    info_logger.info(
        f"[WorkflowTiming] progressive_document_followups_enqueued "
        f"workflow={WORKFLOW_NAME}, document_id={document_id}, user_id={user_id}, "
        f"auto_summary={auto_summary}, auto_podcast={auto_podcast}, auto_graph={auto_graph}"
    )


def _build_workflow():
    workflow = StateGraph(DocumentProcessState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_document_process_task",
        node_func=_init_document_process_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="maybe_transcribe_document",
        node_func=_maybe_transcribe_document,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="convert_document",
        node_func=_convert_document,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="apply_override",
        node_func=_apply_override,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="maybe_tag_document",
        node_func=_maybe_tag_document,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="process_document_chunks",
        node_func=_process_document_chunks,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="maybe_generate_podcast",
        node_func=_maybe_generate_podcast,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_process_success",
        node_func=_mark_process_success,
    )

    workflow.set_entry_point("init_document_process_task")
    workflow.add_edge("init_document_process_task", "maybe_transcribe_document")
    workflow.add_edge("maybe_transcribe_document", "convert_document")
    workflow.add_edge("convert_document", "apply_override")
    workflow.add_edge("apply_override", "maybe_tag_document")
    workflow.add_edge("maybe_tag_document", "process_document_chunks")
    workflow.add_edge("process_document_chunks", "maybe_generate_podcast")
    workflow.add_edge("maybe_generate_podcast", "mark_process_success")
    workflow.add_edge("mark_process_success", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_process_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_process_workflow(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_transcribe: bool = False,
    auto_tag: bool = False,
    override: dict | None = None
) -> None:
    workflow = get_document_process_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
                "auto_summary": auto_summary,
                "auto_podcast": auto_podcast,
                "auto_transcribe": auto_transcribe,
                "auto_tag": auto_tag,
                "override": override,
            },
        )
    except Exception as e:
        exception_logger.error(
            format_log_message(
                "document_process_workflow_failed",
                document_id=document_id,
                user_id=user_id,
                auto_summary=auto_summary,
                auto_podcast=auto_podcast,
                auto_transcribe=auto_transcribe,
                auto_tag=auto_tag,
                error=e,
            ),
            exc_info=True,
        )
        db = session_scope()
        try:
            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document is not None:
                title = _truncate(f"Error: {e}", 200)
                description = _truncate(f"Error: {e}", 1000)
                db_document.title = title
                db_document.description = description
            db_document_process_task = crud.task.get_document_process_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document_process_task is not None:
                db_document_process_task.status = DocumentProcessStatus.FAILED
            db.commit()
        finally:
            db.close()
        raise
