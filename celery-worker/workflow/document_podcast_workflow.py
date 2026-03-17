import uuid
import time
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from common.logger import info_logger
from common.podcast_content import prepare_podcast_markdown
from common.podcast_graph import build_document_podcast_graph_context
from data.common import (
    build_sampled_chunk_indexes,
    ensure_document_chunk_snapshot,
    get_document_markdown_length,
    stream_chunk_document,
)
from data.sql.base import session_scope
from enums.document import DocumentPodcastStatus, DocumentCategory
from common.markdown_helpers import get_markdown_content_by_document_id
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy
from workflow.timing import add_timed_node, ainvoke_with_timing


class DocumentPodcastState(TypedDict, total=False):
    document_id: int
    user_id: int
    engine_id: int
    podcast_file_name: str
    skip_processing: bool
    podcast_mode: str
    podcast_tier: str
    document_title: str
    document_description: str
    graph_context_used: bool


WORKFLOW_NAME = "document_podcast"
SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD = 80_000
SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD = 180_000
SAMPLED_PODCAST_CHUNK_LIMIT = 10
SAMPLED_PODCAST_MAX_TEXT_LENGTH = 12_000
SAMPLED_PODCAST_MAX_CHUNK_TEXT_LENGTH = 1_200


def _normalize_podcast_chunk_text(text: str) -> str:
    compact = " ".join(text.split()).strip()
    if len(compact) <= SAMPLED_PODCAST_MAX_CHUNK_TEXT_LENGTH:
        return compact
    return compact[:SAMPLED_PODCAST_MAX_CHUNK_TEXT_LENGTH].rstrip() + "..."


async def _build_sampled_podcast_text(
    *,
    document_id: int,
    user_id: int,
) -> str:
    snapshot = await ensure_document_chunk_snapshot(
        doc_id=document_id,
        user_id=user_id,
    )
    selected_chunk_indexes = set(
        build_sampled_chunk_indexes(
            total_chunks=snapshot.chunk_count,
            sample_chunks=SAMPLED_PODCAST_CHUNK_LIMIT,
        )
    )
    parts: list[str] = []
    total_length = 0
    async for chunk_info in stream_chunk_document(
        doc_id=document_id,
        chunk_snapshot_path=snapshot.chunk_path,
        user_id=user_id,
        prefer_snapshot=True,
        selected_chunk_indexes=selected_chunk_indexes,
    ):
        chunk_text = _normalize_podcast_chunk_text(chunk_info.text)
        if not chunk_text:
            continue
        candidate_length = total_length + len(chunk_text) + (2 if parts else 0)
        if candidate_length > SAMPLED_PODCAST_MAX_TEXT_LENGTH:
            remaining = SAMPLED_PODCAST_MAX_TEXT_LENGTH - total_length - (2 if parts else 0)
            if remaining > 200:
                parts.append(chunk_text[:remaining].rstrip() + "...")
            break
        parts.append(chunk_text)
        total_length = candidate_length
    return "\n\n".join(parts)


async def _init_podcast_task(
    state: DocumentPodcastState
) -> DocumentPodcastState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document podcast workflow missing document_id or user_id")

    db = session_scope()
    try:
        # 1) 校验 document
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to create the podcast is not found")
        if db_document.category == DocumentCategory.AUDIO:
            state["skip_processing"] = True
            return state  # 音频文档不需要生成播客，直接使用用户上传的音频
        state["document_title"] = db_document.title or ""
        state["document_description"] = db_document.description or ""

        # 2) 校验 user
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
        state["engine_id"] = db_user.default_podcast_user_engine_id

        # 3) 获取/创建task 标记为进行时
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
    finally:
        db.close()
    return state


async def _generate_document_podcast(
    state: DocumentPodcastState
) -> DocumentPodcastState:
    if state.get("skip_processing"):
        return state
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    engine_id = state.get("engine_id")
    if document_id is None or user_id is None or engine_id is None:
        raise Exception("Document podcast workflow missing context")

    remote_file_service = await FileSystemProxy.create(
        user_id=user_id
    )

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    markdown_length = await get_document_markdown_length(document_id)
    prepare_started_at = time.perf_counter()
    markdown_content: str | None = None
    source_chars = 0
    graph_context = ""
    graph_counts = {"entities": 0, "relations": 0, "excerpts": 0}
    if markdown_length >= SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD:
        db = session_scope()
        try:
            db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                db=db,
                document_id=document_id,
            )
            if db_summarize_task is not None and db_summarize_task.summary:
                markdown_content = db_summarize_task.summary
                state["podcast_mode"] = "summary"
                source_chars = len(markdown_content)
        finally:
            db.close()
        if markdown_content is None and markdown_length >= SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD:
            markdown_content = await _build_sampled_podcast_text(
                document_id=document_id,
                user_id=user_id,
            )
            state["podcast_mode"] = "sampled_chunks"
            source_chars = len(markdown_content)
    if markdown_content is None:
        markdown_content = await get_markdown_content_by_document_id(
            document_id=document_id,
            user_id=user_id,
            remote_file_service=remote_file_service,
        )
        state["podcast_mode"] = "full"
        source_chars = len(markdown_content)

    try:
        graph_context, graph_counts = build_document_podcast_graph_context(
            document_id=document_id,
        )
    except Exception as e:
        exception_logger.warning(
            f"[PodcastGraph] failed to build document graph context: "
            f"document_id={document_id}, error={e}"
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
        title=state.get("document_title"),
        description=state.get("document_description"),
    )
    state["podcast_tier"] = podcast_tier
    if not prepared_markdown_content.strip():
        raise Exception("Document podcast content is empty")
    info_logger.info(
        f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, "
        f"stage=prepare_podcast_input, document_id={document_id}, "
        f"markdown_length={markdown_length}, source_mode={state.get('podcast_mode')}, "
        f"podcast_tier={podcast_tier}, source_chars={source_chars}, "
        f"graph_context_used={state.get('graph_context_used')}, "
        f"graph_entities={graph_counts['entities']}, "
        f"graph_relations={graph_counts['relations']}, "
        f"graph_excerpts={graph_counts['excerpts']}, "
        f"prepared_chars={len(prepared_markdown_content)}, "
        f"elapsed_ms={(time.perf_counter() - prepare_started_at) * 1000:.2f}"
    )
    engine = await EngineProxy.create_tts_engine(
        user_id=user_id,
        engine_id=engine_id
    )

    synthesize_started_at = time.perf_counter()
    audio_bytes = await engine.synthesize(
        text=prepared_markdown_content
    )
    info_logger.info(
        f"[WorkflowTiming] stage_end workflow={WORKFLOW_NAME}, "
        f"node=generate_document_podcast, stage=synthesize_audio, "
        f"document_id={document_id}, podcast_tier={podcast_tier}, "
        f"podcast_mode={state.get('podcast_mode')}, "
        f"input_chars={len(prepared_markdown_content)}, "
        f"audio_bytes={len(audio_bytes)}, "
        f"elapsed_ms={(time.perf_counter() - synthesize_started_at) * 1000:.2f}"
    )
    podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
    finally:
        db.close()

    upload_started_at = time.perf_counter()
    await remote_file_service.upload_raw_content_to_path(
        file_path=podcast_file_name,
        content=audio_bytes,
        content_type="audio/mpeg"
    )
    info_logger.info(
        f"[WorkflowTiming] stage_end workflow={WORKFLOW_NAME}, "
        f"node=generate_document_podcast, stage=upload_podcast_audio, "
        f"document_id={document_id}, audio_bytes={len(audio_bytes)}, "
        f"elapsed_ms={(time.perf_counter() - upload_started_at) * 1000:.2f}"
    )
    state["podcast_file_name"] = podcast_file_name
    return state


async def _mark_podcast_success(
    state: DocumentPodcastState
) -> DocumentPodcastState:
    if state.get("skip_processing"):
        return state
    document_id = state.get("document_id")
    podcast_file_name = state.get("podcast_file_name")
    if document_id is None:
        raise Exception("Document podcast workflow missing document_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
        db_podcast_task = crud.task.get_document_podcast_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_podcast_task is not None:
            db_podcast_task.status = DocumentPodcastStatus.SUCCESS
            db_podcast_task.podcast_file_name = podcast_file_name
            db.commit()
    finally:
        db.close()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentPodcastState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_podcast_task",
        node_func=_init_podcast_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="generate_document_podcast",
        node_func=_generate_document_podcast,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_podcast_success",
        node_func=_mark_podcast_success,
    )
    workflow.set_entry_point("init_podcast_task")
    workflow.add_edge("init_podcast_task", "generate_document_podcast")
    workflow.add_edge("generate_document_podcast", "mark_podcast_success")
    workflow.add_edge("mark_podcast_success", END)
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
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
            },
        )
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        db = session_scope()
        try:
            db_podcast_task = crud.task.get_document_podcast_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_podcast_task is not None:
                db_podcast_task.status = DocumentPodcastStatus.FAILED
                db.commit()
        finally:
            db.close()
        raise
