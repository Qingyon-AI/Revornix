import json
import uuid
from datetime import datetime, timezone
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from base_implement.stt_engine_base import Segment

from common.logger import exception_logger, info_logger, log_event
from common.document_guard import ensure_document_active
from data.sql.base import async_session_context
from enums.document import DocumentCategory, DocumentAudioTranscribeStatus
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy
from workflow.cancelled import WorkflowCancelledError
from workflow.timing import add_timed_node, ainvoke_with_timing


class DocumentTranscribeState(TypedDict, total=False):
    document_id: int
    user_id: int
    engine_id: int
    meeting_mode: bool
    skip_processing: bool


WORKFLOW_NAME = "document_transcribe"


def _format_timestamp(seconds: float) -> str:
    total_ms = max(int(round(seconds * 1000)), 0)
    total, milliseconds = divmod(total_ms, 1000)
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"
    return f"{minutes:02d}:{secs:02d}.{milliseconds:03d}"


def _render_meeting_markdown(
    segments: list[Segment],
    speaker_map: dict[str, str] | None,
) -> str:
    """Render diarized segments into a speaker-labelled meeting transcript."""
    speaker_map = speaker_map or {}
    lines: list[str] = []
    for segment in segments:
        raw_speaker = segment.speaker
        if raw_speaker:
            display_name = speaker_map.get(raw_speaker, raw_speaker)
        else:
            display_name = "Unknown"
        lines.append(f"**{display_name}** `{_format_timestamp(segment.start)}`")
        lines.append("")
        lines.append(segment.text)
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _serialize_segments(segments: list[Segment]) -> str:
    """Serialize segments into the structured transcript JSON for meeting mode."""
    return json.dumps(
        {"segments": [segment._asdict() for segment in segments]},
        ensure_ascii=False,
    )


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

        db_audio_document = await crud.document.get_audio_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_audio_document is None:
            raise Exception("The document you want to process do not have a the audio info")
        meeting_mode = bool(db_audio_document.meeting_mode)
        state["meeting_mode"] = meeting_mode

        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if state.get("engine_id") is None:
            # One engine handles both modes; meeting mode just toggles whether
            # the workflow asks for segments via ``with_segments=True``.
            resolved_engine_id = db_user.default_audio_transcribe_engine_id
            if resolved_engine_id is None:
                raise Exception("The user which you want to process document has not set default audio transcribe user engine")
            state["engine_id"] = resolved_engine_id

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
    meeting_mode = bool(state.get("meeting_mode"))
    if document_id is None or user_id is None or engine_id is None:
        raise Exception("Document transcribe workflow missing context")
    await _ensure_transcribe_task_not_cancelled(document_id)

    audio_file_name = None
    speaker_map: dict[str, str] | None = None
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
        if db_audio_document.speaker_map:
            try:
                speaker_map = json.loads(db_audio_document.speaker_map)
            except (ValueError, TypeError):
                speaker_map = None

    if audio_file_name is None:
        raise Exception("The audio file name is missing")

    engine = await EngineProxy.create_stt_engine(
        user_id=user_id,
        engine_id=engine_id
    )
    # Defensive guard: the API layer validates capability at create/transcribe
    # time, but the engine config may have changed since. Fail fast rather than
    # silently degrading a meeting record to a plain transcript.
    if meeting_mode and not engine.CAPABILITY.segments:
        raise Exception("The selected STT engine does not support meeting mode (timestamped segments)")

    log_event(
        info_logger,
        "document_transcribe_engine_invocation",
        document_id=document_id,
        user_id=user_id,
        engine_id=engine_id,
        engine_name=getattr(engine, "engine_name", None),
        audio_file_name=audio_file_name,
        meeting_mode=meeting_mode,
    )
    result = await engine.transcribe_audio(
        audio_file_name=audio_file_name,
        with_segments=meeting_mode,
    )
    segments = result.segments or []

    # Mirror what FILE/WEBSITE convert does: upload the transcript as a
    # standalone markdown file in the user's default file system so every
    # downstream stage (chunking, embedding, summarisation, graph) reads
    # through the same FileSystemProxy code path. In meeting mode the markdown
    # is speaker-labelled and the structured segments are persisted alongside.
    md_file_name = f"audio_transcripts/{uuid.uuid4().hex}.md"
    segments_file_name: str | None = None
    if meeting_mode and segments:
        md_content = _render_meeting_markdown(segments, speaker_map)
        segments_file_name = f"audio_transcripts/{uuid.uuid4().hex}.segments.json"
    else:
        md_content = result.text or ""

    remote_file_service = await FileSystemProxy.create(user_id=user_id)
    await _ensure_transcribe_task_not_cancelled(document_id)
    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
    await remote_file_service.upload_raw_content_to_path(
        file_path=md_file_name,
        content=md_content.encode("utf-8"),
        content_type="text/plain",
    )
    if segments_file_name is not None:
        await remote_file_service.upload_raw_content_to_path(
            file_path=segments_file_name,
            content=_serialize_segments(segments).encode("utf-8"),
            content_type="application/json",
        )

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
        db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_transcribe_task is None:
            raise Exception("The transcribe task of the document is not found")
        db_transcribe_task.md_file_name = md_file_name
        db_transcribe_task.segments_file_name = segments_file_name
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
