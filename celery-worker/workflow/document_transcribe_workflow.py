from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from data.sql.base import session_scope
from enums.document import DocumentCategory, DocumentAudioTranscribeStatus
from proxy.engine_proxy import EngineProxy


class DocumentTranscribeState(TypedDict, total=False):
    document_id: int
    user_id: int
    engine_id: int
    skip_processing: bool


async def _init_transcribe_task(
    state: DocumentTranscribeState
) -> DocumentTranscribeState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document transcribe workflow missing document_id or user_id")

    db = session_scope()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if db_document.category != DocumentCategory.AUDIO:
            # 只有音频文档需要解析音频，别的直接返回
            state["skip_processing"] = True
            return state

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_audio_transcribe_engine_id is None:
            raise Exception("The user which you want to process document has not set default audio transcribe user engine")

        state["engine_id"] = db_user.default_audio_transcribe_engine_id

        db_transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_transcribe_task is None:
            db_transcribe_task = crud.task.create_document_audio_transcribe_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
                status=DocumentAudioTranscribeStatus.TRANSCRIBING
            )
        else:
            if db_transcribe_task.status != DocumentAudioTranscribeStatus.TRANSCRIBING:
                db_transcribe_task.status = DocumentAudioTranscribeStatus.TRANSCRIBING
        db.commit()
    finally:
        db.close()
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

    db = session_scope()
    try:
        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=engine_id
        )
        if db_engine is None:
            raise Exception("There are something wrong with the user's audio transcribe engine")

        engine = await EngineProxy.create(
            user_id=user_id,
            engine_id=engine_id
        )

        ensure_document_active(db=db, document_id=document_id)
        db_audio_document = crud.document.get_audio_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_audio_document is None:
            raise Exception("The document you want to process do not have a the audio info")

        text = await engine.transcribe_audio(
            audio_file_name=db_audio_document.audio_file_name
        )
        ensure_document_active(db=db, document_id=document_id)
        db_transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_transcribe_task is None:
            raise Exception("The transcribe task of the document is not found")
        db_transcribe_task.transcribed_text = text
        db_transcribe_task.status = DocumentAudioTranscribeStatus.SUCCESS
        db.commit()
    finally:
        db.close()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentTranscribeState)
    workflow.add_node("init_transcribe_task", _init_transcribe_task)
    workflow.add_node("transcribe_document", _transcribe_document_audio)
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
    user_id: int
) -> None:
    workflow = get_document_transcribe_workflow()
    try:
        await workflow.ainvoke(
            {
                "document_id": document_id,
                "user_id": user_id,
            }
        )
    except Exception as e:
        exception_logger.error(f"Something is error while transcribing document audio: {e}")
        db = session_scope()
        try:
            db_transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_transcribe_task is not None:
                db_transcribe_task.status = DocumentAudioTranscribeStatus.FAILED
                db.commit()
        finally:
            db.close()
        raise
