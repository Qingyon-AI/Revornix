import json
import uuid
import time
from datetime import datetime, timezone
from typing import TypedDict

import crud
from celery import current_app
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.logger import info_logger
from data.sql.base import async_session_context
from enums.notification import NotificationTriggerEventUUID
from enums.section import SectionPodcastStatus, UserSectionRole
from common.markdown_helpers import get_markdown_content_by_section_id
from common.podcast_content import prepare_podcast_markdown
from common.podcast_graph import build_section_podcast_graph_context
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy
from workflow.cancelled import WorkflowCancelledError
from workflow.timing import add_timed_node, ainvoke_with_timing, format_elapsed_fields


class SectionPodcastState(TypedDict, total=False):
    section_id: int
    user_id: int
    engine_id: int
    podcast_file_name: str
    section_title: str
    section_description: str
    podcast_tier: str
    graph_context_used: bool
    podcast_script_file_name: str


WORKFLOW_NAME = "section_podcast"


async def _ensure_section_podcast_task_not_cancelled(section_id: int) -> None:
    async with async_session_context() as db:
        db_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        if (
            db_podcast_task is not None
            and db_podcast_task.status == SectionPodcastStatus.CANCELLED
        ):
            raise WorkflowCancelledError(
                f"Section podcast task cancelled: section_id={section_id}"
            )

async def _init_section_podcast_task(
    state: SectionPodcastState
) -> SectionPodcastState:
    section_id = state.get("section_id")
    user_id = state.get("user_id")
    if section_id is None or user_id is None:
        raise Exception("Section podcast workflow missing section_id or user_id")
    await _ensure_section_podcast_task_not_cancelled(section_id)

    async with async_session_context() as db:
        db_section = await crud.section.get_section_by_section_id_async(
            db=db,
            section_id=section_id
        )
        if db_section is None:
            raise Exception("The section which want to process podcast is not found")
        state["section_title"] = db_section.title or ""
        state["section_description"] = db_section.description or ""

        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user who want to process section is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user who want to process section has not set default user file system")
        if state.get("engine_id") is None and db_user.default_podcast_user_engine_id is None:
            raise Exception("The user who want to process section has not set default podcast user engine")
        if state.get("engine_id") is None:
            state["engine_id"] = db_user.default_podcast_user_engine_id

        db_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
            db=db,
            section_id=section_id
        )
        if db_podcast_task is None:
            db_podcast_task = await crud.task.create_section_podcast_task_async(
                db=db,
                user_id=user_id,
                section_id=section_id,
                status=SectionPodcastStatus.GENERATING
            )
        else:
            if db_podcast_task.status != SectionPodcastStatus.GENERATING:
                db_podcast_task.status = SectionPodcastStatus.GENERATING
                db_podcast_task.update_time = datetime.now(timezone.utc)
        await db.commit()
    return state


async def _generate_section_podcast(
    state: SectionPodcastState
) -> SectionPodcastState:
    section_id = state.get("section_id")
    user_id = state.get("user_id")
    engine_id = state.get("engine_id")
    if section_id is None or user_id is None or engine_id is None:
        raise Exception("Section podcast workflow missing context")
    await _ensure_section_podcast_task_not_cancelled(section_id)

    remote_file_service = await FileSystemProxy.create(
        user_id=user_id
    )
    prepare_started_at = time.perf_counter()
    markdown_content = await get_markdown_content_by_section_id(
        section_id=section_id,
        user_id=user_id,
        remote_file_service=remote_file_service,
    )
    source_chars = len(markdown_content)
    graph_context = ""
    graph_counts = {"entities": 0, "relations": 0, "excerpts": 0}
    try:
        graph_context, graph_counts = await build_section_podcast_graph_context(
            section_id=section_id,
            user_id=user_id,
        )
    except Exception as e:
        exception_logger.warning(
            f"[PodcastGraph] failed to build section graph context: "
            f"section_id={section_id}, user_id={user_id}, error={e}"
        )
        graph_context = ""
        graph_counts = {"entities": 0, "relations": 0, "excerpts": 0}
    if graph_context:
        markdown_content = f"{markdown_content}\n\n{graph_context}".strip()
        state["graph_context_used"] = True
    else:
        state["graph_context_used"] = False

    prepared_markdown_content, podcast_tier = prepare_podcast_markdown(
        markdown=markdown_content,
        title=state.get("section_title"),
        description=state.get("section_description"),
    )
    state["podcast_tier"] = podcast_tier
    if not prepared_markdown_content.strip():
        raise Exception("Section podcast content is empty")
    info_logger.info(
        f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, "
        f"stage=prepare_podcast_input, section_id={section_id}, "
        f"source_chars={source_chars}, "
        f"graph_context_used={state.get('graph_context_used')}, "
        f"graph_entities={graph_counts['entities']}, "
        f"graph_relations={graph_counts['relations']}, "
        f"graph_excerpts={graph_counts['excerpts']}, "
        f"prepared_chars={len(prepared_markdown_content)}, "
        f"podcast_tier={podcast_tier}, "
        f"{format_elapsed_fields((time.perf_counter() - prepare_started_at) * 1000)}"
    )

    engine = await EngineProxy.create_tts_engine(
        user_id=user_id,
        engine_id=engine_id
    )

    synthesize_started_at = time.perf_counter()
    synthesis_result = await engine.synthesize(
        text=prepared_markdown_content
    )
    await _ensure_section_podcast_task_not_cancelled(section_id)
    info_logger.info(
        f"[WorkflowTiming] stage_end workflow={WORKFLOW_NAME}, "
        f"node=generate_section_podcast, stage=synthesize_audio, "
        f"section_id={section_id}, podcast_tier={podcast_tier}, "
        f"input_chars={len(prepared_markdown_content)}, audio_bytes={len(synthesis_result.audio_bytes)}, "
        f"{format_elapsed_fields((time.perf_counter() - synthesize_started_at) * 1000)}"
    )

    podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
    podcast_script_file_name = f"files/{uuid.uuid4().hex}.json"
    upload_started_at = time.perf_counter()
    await remote_file_service.upload_raw_content_to_path(
        file_path=podcast_file_name,
        content=synthesis_result.audio_bytes,
        content_type="audio/mpeg"
    )
    await remote_file_service.upload_raw_content_to_path(
        file_path=podcast_script_file_name,
        content=json.dumps(
            {
                "version": 1,
                "title": state.get("section_title"),
                "plain_text": synthesis_result.script_text or prepared_markdown_content,
                "segments": synthesis_result.script_segments or [],
            },
            ensure_ascii=False,
        ).encode("utf-8"),
        content_type="application/json"
    )
    info_logger.info(
        f"[WorkflowTiming] stage_end workflow={WORKFLOW_NAME}, "
        f"node=generate_section_podcast, stage=upload_podcast_audio, "
        f"section_id={section_id}, audio_bytes={len(synthesis_result.audio_bytes)}, "
        f"{format_elapsed_fields((time.perf_counter() - upload_started_at) * 1000)}"
    )
    state["podcast_file_name"] = podcast_file_name
    state["podcast_script_file_name"] = podcast_script_file_name
    return state


async def _mark_section_podcast_success(
    state: SectionPodcastState
) -> SectionPodcastState:
    section_id = state.get("section_id")
    podcast_file_name = state.get("podcast_file_name")
    podcast_script_file_name = state.get("podcast_script_file_name")
    if section_id is None:
        raise Exception("Section podcast workflow missing section_id")
    await _ensure_section_podcast_task_not_cancelled(section_id)

    async with async_session_context() as db:
        db_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
            db=db,
            section_id=section_id
        )
        if db_podcast_task is not None:
            db_podcast_task.status = SectionPodcastStatus.SUCCESS
            db_podcast_task.podcast_file_name = podcast_file_name
            db_podcast_task.podcast_script_file_name = podcast_script_file_name
            db_podcast_task.celery_task_id = None
            db_podcast_task.update_time = datetime.now(timezone.utc)
            await db.commit()

        db_recipients = await crud.section.get_users_for_section_by_section_id_async(
            db=db,
            section_id=section_id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR],
        )

    for db_recipient in db_recipients:
        try:
            current_app.send_task(
                "common.celery.app.start_trigger_user_notification_event",
                kwargs={
                    "user_id": db_recipient.id,
                    "trigger_event_uuid": NotificationTriggerEventUUID.SECTION_PODCAST_READY.value,
                    "params": {
                        "section_id": section_id,
                        "receiver_id": db_recipient.id,
                    },
                },
            )
        except Exception as e:
            exception_logger.error(
                f"Failed to dispatch section_podcast_ready notification: section_id={section_id}, user_id={db_recipient.id}, error={e}"
            )

    return state


def _build_workflow():
    workflow = StateGraph(SectionPodcastState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_section_podcast_task",
        node_func=_init_section_podcast_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="generate_section_podcast",
        node_func=_generate_section_podcast,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_section_podcast_success",
        node_func=_mark_section_podcast_success,
    )
    workflow.set_entry_point("init_section_podcast_task")
    workflow.add_edge("init_section_podcast_task", "generate_section_podcast")
    workflow.add_edge("generate_section_podcast", "mark_section_podcast_success")
    workflow.add_edge("mark_section_podcast_success", END)
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
    user_id: int,
    engine_id: int | None = None,
) -> None:
    workflow = get_section_podcast_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "section_id": section_id,
                "user_id": user_id,
                "engine_id": engine_id,
            },
        )
    except WorkflowCancelledError:
        async with async_session_context() as db:
            db_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
                db=db,
                section_id=section_id
            )
            if db_podcast_task is not None:
                db_podcast_task.status = SectionPodcastStatus.CANCELLED
                db_podcast_task.celery_task_id = None
                db_podcast_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        async with async_session_context() as db:
            db_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
                db=db,
                section_id=section_id
            )
            if (
                db_podcast_task is not None
                and db_podcast_task.status != SectionPodcastStatus.CANCELLED
            ):
                db_podcast_task.status = SectionPodcastStatus.FAILED
                db_podcast_task.celery_task_id = None
                db_podcast_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
