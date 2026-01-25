from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.document import DocumentCategory, DocumentAudioTranscribeStatus
from proxy.engine_proxy import EngineProxy


class DocumentTranscribeState(TypedDict, total=False):
    document_id: int
    user_id: int


async def handle_transcribe_document_audio(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if db_document.category != DocumentCategory.AUDIO:
            # 只有音频文档需要解析音频，别的直接返回
            return

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_audio_transcribe_engine_id is None:
            raise Exception("The user which you want to process document has not set default audio transcribe user engine")

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

        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=db_user.default_audio_transcribe_engine_id
        )
        if db_engine is None:
            raise Exception("There are something wrong with the user's audio transcribe engine")

        engine = await EngineProxy.create(
            user_id=user_id,
            engine_id=db_user.default_audio_transcribe_engine_id
        )

        db_audio_document = crud.document.get_audio_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_audio_document is None:
            raise Exception("The document you want to process do not have a the audio info")

        text = await engine.transcribe_audio(
            audio_file_name=db_audio_document.audio_file_name
        )

        db_transcribe_task.transcribed_text = text
        db_transcribe_task.status = DocumentAudioTranscribeStatus.SUCCESS
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while converting the document to markdown: {e}")
        db_transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_transcribe_task is not None:
            db_transcribe_task.status = DocumentAudioTranscribeStatus.FAILED
            db.commit()
        raise
    finally:
        db.close()


async def _transcribe_document(
    state: DocumentTranscribeState
) -> DocumentTranscribeState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document transcribe workflow missing document_id or user_id")

    await handle_transcribe_document_audio(
        document_id=document_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentTranscribeState)
    workflow.add_node("transcribe_document", _transcribe_document)
    workflow.set_entry_point("transcribe_document")
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
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
        }
    )
