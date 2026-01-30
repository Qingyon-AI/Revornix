import uuid
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.section import SectionPodcastStatus
from common.markdown_helpers import get_markdown_content_by_section_id
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy


class SectionPodcastState(TypedDict, total=False):
    section_id: int
    user_id: int


async def handle_update_section_ai_podcast(
    section_id: int,
    user_id: int
):
    db = SessionLocal()
    try:
        db_section = crud.section.get_section_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_section is None:
            raise Exception("The section which want to process podcast is not found")

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user who want to process section is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user who want to process section has not set default user file system")
        if db_user.default_podcast_user_engine_id is None:
            raise Exception("The user who want to process section has not set default podcast user engine")

        db_podcast_task = crud.task.get_section_podcast_task_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_podcast_task is None:
            db_podcast_task = crud.task.create_section_podcast_task(
                db=db,
                user_id=user_id,
                section_id=section_id,
                status=SectionPodcastStatus.GENERATING
            )
        else:
            if db_podcast_task.status != SectionPodcastStatus.GENERATING:
                db_podcast_task.status = SectionPodcastStatus.GENERATING
        db.commit()
        
        remote_file_service = await FileSystemProxy.create(
            user_id=user_id
        )

        markdown_content = await get_markdown_content_by_section_id(
            section_id=section_id,
            user_id=user_id
        )
        
        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=db_user.default_podcast_user_engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's podcast generator engine")

        engine = await EngineProxy.create(
            user_id=user_id,
            engine_id=db_user.default_podcast_user_engine_id
        )

        audio_bytes = await engine.synthesize(
            text=markdown_content
        )
        if audio_bytes is None:
            db_podcast_task.status = SectionPodcastStatus.FAILED
            db.commit()
            raise Exception("The podcast of the section is not generated because of the error of the engine")

        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(
            file_path=podcast_file_name,
            content=audio_bytes,
            content_type="audio/mpeg"
        )

        db_podcast_task.status = SectionPodcastStatus.SUCCESS
        db_podcast_task.podcast_file_name = podcast_file_name
        db.commit()

    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        db_podcast_task = crud.task.get_section_podcast_task_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_podcast_task is not None:
            db_podcast_task.status = SectionPodcastStatus.FAILED
            db.commit()
        raise
    finally:
        db.close()


async def _generate_section_podcast(state: SectionPodcastState) -> SectionPodcastState:
    section_id = state.get("section_id")
    user_id = state.get("user_id")
    if section_id is None or user_id is None:
        raise Exception("Section podcast workflow missing section_id or user_id")

    await handle_update_section_ai_podcast(
        section_id=section_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(SectionPodcastState)
    workflow.add_node("generate_section_podcast", _generate_section_podcast)
    workflow.set_entry_point("generate_section_podcast")
    workflow.add_edge("generate_section_podcast", END)
    return workflow.compile()


_WORKFLOW = None


def get_section_podcast_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_section_podcast_workflow(
    *,
    section_id: int,
    user_id: int
) -> None:
    workflow = get_section_podcast_workflow()
    await workflow.ainvoke(
        {
            "section_id": section_id,
            "user_id": user_id,
        }
    )
