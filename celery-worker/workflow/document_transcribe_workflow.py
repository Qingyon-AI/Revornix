from datetime import datetime, timezone
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from data.sql.base import async_session_context
from enums.document import DocumentCategory, DocumentAudioTranscribeStatus
from proxy.engine_proxy import EngineProxy
from workflow.cancelled import WorkflowCancelledError
from workflow.timing import add_timed_node, ainvoke_with_timing


class DocumentTranscribeState(TypedDict, total=False):
    document_id: int
    user_id: int
    engine_id: int
    skip_processing: bool


WORKFLOW_NAME = "document_transcribe"


async def _ensure_transcribe_task_not_cancelled(document_id: int) -> None:
    async with async_session_context() as db:
        db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if (
            db_transcribe_task is not None
            and db_transcribe_task.status == DocumentAudioTranscribeStatus.CANCELLED
        ):
            raise WorkflowCancelledError(
                f"Document transcribe task cancelled: document_id={document_id}"
            )


async def _init_transcribe_task(
    state: DocumentTranscribeState
) -> DocumentTranscribeState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document transcribe workflow missing document_id or user_id")
    await _ensure_transcribe_task_not_cancelled(document_id)

    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if db_document.category != DocumentCategory.AUDIO:
            state["skip_processing"] = True
            return state

        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if state.get("engine_id") is None and db_user.default_audio_transcribe_engine_id is None:
            raise Exception("The user which you want to process document has not set default audio transcribe user engine")
        if state.get("engine_id") is None:
            state["engine_id"] = db_user.default_audio_transcribe_engine_id

        db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_transcribe_task is None:
            db_transcribe_task = await crud.task.create_document_audio_transcribe_task_async(
                db=db,
                user_id=user_id,
                document_id=document_id,
                status=DocumentAudioTranscribeStatus.TRANSCRIBING
            )
        else:
            if db_transcribe_task.status != DocumentAudioTranscribeStatus.TRANSCRIBING:
                db_transcribe_task.status = DocumentAudioTranscribeStatus.TRANSCRIBING
                db_transcribe_task.update_time = datetime.now(timezone.utc)
        await db.commit()
    return state


async def _transcribe_document_audio(
    state: DocumentTranscribeState
) -> DocumentTranscribeState:
    if state.get("skip_processing"):
        return state
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    engine_id = state.get("engine_id")
    if document_id is None or user_id is None or engine_id is None:
        raise Exception("Document transcribe workflow missing context")
    await _ensure_transcribe_task_not_cancelled(document_id)

    audio_file_name = None
    async with async_session_context() as db:
        await _ensure_transcribe_task_not_cancelled(document_id)
        await ensure_document_active(db=db, document_id=document_id)
        db_audio_document = await crud.document.get_audio_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_audio_document is None:
            raise Exception("The document you want to process do not have a the audio info")
        audio_file_name = db_audio_document.audio_file_name

    if audio_file_name is None:
        raise Exception("The audio file name is missing")

    engine = await EngineProxy.create_stt_engine(
        user_id=user_id,
        engine_id=engine_id
    )
    text = await engine.transcribe_audio(
        audio_file_name=audio_file_name
    )

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
        db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_transcribe_task is None:
            raise Exception("The transcribe task of the document is not found")
        db_transcribe_task.transcribed_text = text
        db_transcribe_task.status = DocumentAudioTranscribeStatus.SUCCESS
        db_transcribe_task.celery_task_id = None
        db_transcribe_task.update_time = datetime.now(timezone.utc)
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is not None:
            db_document.content_update_time = datetime.now(timezone.utc)
        await db.commit()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentTranscribeState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_transcribe_task",
        node_func=_init_transcribe_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="transcribe_document",
        node_func=_transcribe_document_audio,
    )
    workflow.set_entry_point("init_transcribe_task")
    workflow.add_edge("init_transcribe_task", "transcribe_document")
    workflow.add_edge("transcribe_document", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_transcribe_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_transcribe_workflow(
    *,
    document_id: int,
    user_id: int,
    engine_id: int | None = None,
) -> None:
    workflow = get_document_transcribe_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
                "engine_id": engine_id,
            },
        )
    except WorkflowCancelledError:
        async with async_session_context() as db:
            db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_transcribe_task is not None:
                db_transcribe_task.status = DocumentAudioTranscribeStatus.CANCELLED
                db_transcribe_task.celery_task_id = None
                db_transcribe_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
    except Exception as e:
        exception_logger.error(f"Something is error while transcribing document audio: {e}")
        async with async_session_context() as db:
            db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if (
                db_transcribe_task is not None
                and db_transcribe_task.status != DocumentAudioTranscribeStatus.CANCELLED
            ):
                db_transcribe_task.status = DocumentAudioTranscribeStatus.FAILED
                db_transcribe_task.celery_task_id = None
                db_transcribe_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
