import uuid
from typing import TypedDict, cast

import crud
from langgraph.graph import StateGraph, END

from common.common import get_user_remote_file_system
from common.logger import exception_logger
from data.sql.base import SessionLocal
from engine.tts.openai import OpenAIAudioEngine
from engine.tts.volc.official_volc import OfficialVolcTTSEngine
from engine.tts.volc.tts import VolcTTSEngine
from enums.document import DocumentPodcastStatus
from enums.engine import Engine
from workflow.markdown_helpers import get_markdown_content_by_document_id
from proxy.engine_proxy import EngineProxy


class DocumentPodcastState(TypedDict, total=False):
    document_id: int
    user_id: int


async def handle_update_document_ai_podcast(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
    db_podcast_task = crud.task.get_document_podcast_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_podcast_task is None:
        db_podcast_task = crud.task.create_document_podcast_task(
            db=db,
            user_id=user_id,
            document_id=document_id,
        )
    if db_podcast_task.status != DocumentPodcastStatus.GENERATING:
        db_podcast_task.status = DocumentPodcastStatus.GENERATING
    db.commit()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to create the podcast is not found")

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The document's creator is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The document's creator has not set the default file system")
        if db_user.default_podcast_user_engine_id is None:
            raise Exception("The document's creator has not set the default podcast generate engine")

        remote_file_service = await get_user_remote_file_system(
            user_id=user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )

        markdown_content = await get_markdown_content_by_document_id(
            document_id=db_document.id,
            user_id=user_id
        )
        
        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=db_user.default_podcast_user_engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's default podcast generate engine")

        if db_engine.engine_provided.uuid == Engine.Volc_TTS.meta.uuid:
            engine = VolcTTSEngine()
        elif db_engine.engine_provided.uuid == Engine.OpenAI_TTS.meta.uuid:
            engine = OpenAIAudioEngine()
        elif db_engine.engine_provided.uuid == Engine.Official_Volc_TTS.meta.uuid:
            engine = OfficialVolcTTSEngine()
        else:
            raise Exception(f"Unsupport engine, engine uuid: {db_engine.uuid}, engine_provided uuid: {db_engine.engine_provided.uuid}")
        engine.set_user_id(user_id=user_id)
        engine_config = (await EngineProxy.create(
            user_id=user_id,
            engine_id=db_engine.id
        )).get_configuration()
        if engine_config:
            engine.set_engine_config(engine_config=engine_config)

        audio_bytes = await engine.synthesize(
            text=markdown_content
        )
        if audio_bytes is None:
            db_podcast_task.status = DocumentPodcastStatus.FAILED
            db.commit()
            raise Exception("The podcast of the document is not generated because of the error of the engine")
        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(
            file_path=podcast_file_name,
            content=audio_bytes,
            content_type="audio/mpeg"
        )

        db_podcast_task.status = DocumentPodcastStatus.SUCCESS
        db_podcast_task.podcast_file_name = podcast_file_name
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        db_podcast_task.status = DocumentPodcastStatus.FAILED
        db.commit()
        raise
    finally:
        db.close()


async def _generate_document_podcast(state: DocumentPodcastState) -> DocumentPodcastState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document podcast workflow missing document_id or user_id")
    document_id = cast(int, document_id)
    user_id = cast(int, user_id)

    await handle_update_document_ai_podcast(
        document_id=document_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentPodcastState)
    workflow.add_node("generate_document_podcast", _generate_document_podcast)
    workflow.set_entry_point("generate_document_podcast")
    workflow.add_edge("generate_document_podcast", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_podcast_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_podcast_workflow(
    *,
    document_id: int,
    user_id: int
) -> None:
    workflow = get_document_podcast_workflow()
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
        }
    )
