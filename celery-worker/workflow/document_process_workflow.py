from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from data.sql.base import session_scope
from enums.document import DocumentProcessStatus
from schemas.task import DocumentOverrideProperty
from workflow.document_chunk_process_workflow import run_document_chunk_process_workflow
from workflow.document_convert_workflow import run_document_convert_workflow
from workflow.document_podcast_workflow import run_document_podcast_workflow
from workflow.document_tag_workflow import run_document_tag_workflow
from workflow.document_transcribe_workflow import run_document_transcribe_workflow


class DocumentProcessState(TypedDict, total=False):
    document_id: int
    user_id: int
    auto_summary: bool
    auto_podcast: bool
    auto_transcribe: bool
    auto_tag: bool
    override: dict | DocumentOverrideProperty | None


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
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    await run_document_chunk_process_workflow(
        document_id=document_id,
        user_id=user_id,
        auto_summary=auto_summary,
    )
    return state


async def _maybe_generate_podcast(
    state: DocumentProcessState
) -> DocumentProcessState:
    if not state.get("auto_podcast"):
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


def _build_workflow():
    workflow = StateGraph(DocumentProcessState)
    workflow.add_node("init_document_process_task", _init_document_process_task)
    workflow.add_node("maybe_transcribe_document", _maybe_transcribe_document)
    workflow.add_node("convert_document", _convert_document)
    workflow.add_node("apply_override", _apply_override)
    workflow.add_node("maybe_tag_document", _maybe_tag_document)
    workflow.add_node("process_document_chunks", _process_document_chunks)
    workflow.add_node("maybe_generate_podcast", _maybe_generate_podcast)
    workflow.add_node("mark_process_success", _mark_process_success)

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
        await workflow.ainvoke(
            {
                "document_id": document_id,
                "user_id": user_id,
                "auto_summary": auto_summary,
                "auto_podcast": auto_podcast,
                "auto_transcribe": auto_transcribe,
                "auto_tag": auto_tag,
                "override": override,
            }
        )
    except Exception as e:
        exception_logger.error(f"Something is error while process document info: {e}")
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
