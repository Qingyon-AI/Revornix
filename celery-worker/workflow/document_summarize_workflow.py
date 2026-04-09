import time
from datetime import datetime, timezone
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import reducer_summary, summary_content
from common.logger import exception_logger, info_logger
from common.document_guard import ensure_document_active
from data.common import (
    build_sampled_chunk_indexes,
    close_extract_llm_client,
    ensure_document_chunk_snapshot,
    extract_entities_relations,
    get_document_markdown_length,
    get_extract_llm_client,
    stream_chunk_document,
)
from data.sql.base import session_scope
from enums.document import DocumentSummarizeStatus
from proxy.ai_model_proxy import AIModelProxy
from workflow.timing import add_timed_node, ainvoke_with_timing, timed_stage


class DocumentSummarizeState(TypedDict, total=False):
    document_id: int
    user_id: int
    model_id: int
    llm_model_name: str
    summary: str
    title: str
    description: str
    chunk_snapshot_path: str | None
    summary_mode: str | None


WORKFLOW_NAME = "document_summarize"
SAMPLED_SUMMARY_MARKDOWN_CHAR_THRESHOLD = 400_000
SAMPLED_SUMMARY_CHUNK_LIMIT = 18


async def _init_summarize_task(
    state: DocumentSummarizeState
) -> DocumentSummarizeState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document summarize workflow missing document_id or user_id")

    db = session_scope()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to summarize is not found")

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to summarize document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to summarize document has not set default user file system")
        if state.get("model_id") is None and db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to summarize document has not set default document reader model")
        if state.get("model_id") is None:
            state["model_id"] = db_user.default_document_reader_model_id

        db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_summarize_task is None:
            db_summarize_task = crud.task.create_document_summarize_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
            )
        if db_summarize_task.status != DocumentSummarizeStatus.SUMMARIZING:
            db_summarize_task.status = DocumentSummarizeStatus.SUMMARIZING
            db_summarize_task.update_time = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()
    return state


async def _prepare_summarize_context(
    state: DocumentSummarizeState
) -> DocumentSummarizeState:
    user_id = state.get("user_id")
    model_id = state.get("model_id")
    if user_id is None or model_id is None:
        raise Exception("Document summarize workflow missing model_id or user_id")

    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()
    state["llm_model_name"] = model_configuration.model_name
    return state


async def _summarize_document(
    state: DocumentSummarizeState
) -> DocumentSummarizeState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    model_id = state.get("model_id")
    llm_model = state.get("llm_model_name")
    chunk_snapshot_path = state.get("chunk_snapshot_path")
    summary_mode = state.get("summary_mode")
    if document_id is None or user_id is None or model_id is None or llm_model is None:
        raise Exception("Document summarize workflow missing context")

    if summary_mode is None:
        markdown_length = await get_document_markdown_length(document_id)
        summary_mode = (
            "sampled"
            if markdown_length >= SAMPLED_SUMMARY_MARKDOWN_CHAR_THRESHOLD
            else "full"
        )

    selected_chunk_indexes: set[int] | None = None
    if summary_mode == "sampled":
        snapshot = await ensure_document_chunk_snapshot(
            doc_id=document_id,
            user_id=user_id,
        )
        chunk_snapshot_path = snapshot.chunk_path
        selected_chunk_indexes = set(
            build_sampled_chunk_indexes(
                total_chunks=snapshot.chunk_count,
                sample_chunks=SAMPLED_SUMMARY_CHUNK_LIMIT,
            )
        )

    llm_client = await get_extract_llm_client(
        user_id=user_id
    )
    final_summary_info = None
    chunk_count = 0
    extract_elapsed_ms = 0.0
    summary_elapsed_ms = 0.0
    reduce_elapsed_ms = 0.0
    reduce_count = 0
    try:
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="summarize_document",
            stage_name="summarize_chunks",
            context={
                "document_id": document_id,
                "user_id": user_id,
                "chunk_snapshot_path": chunk_snapshot_path,
                "summary_mode": summary_mode,
                "sampled_chunks": (
                    len(selected_chunk_indexes)
                    if selected_chunk_indexes is not None
                    else None
                ),
            },
        ):
            async for chunk_info in stream_chunk_document(
                doc_id=document_id,
                chunk_snapshot_path=chunk_snapshot_path,
                user_id=user_id,
                prefer_snapshot=True,
                selected_chunk_indexes=selected_chunk_indexes,
            ):
                chunk_count += 1
                extract_start = time.perf_counter()
                sub_entities, sub_relations = await extract_entities_relations(
                    user_id=user_id,
                    llm_client=llm_client,
                    llm_model=llm_model,
                    chunk=chunk_info
                )
                extract_elapsed_ms += (time.perf_counter() - extract_start) * 1000

                summary_start = time.perf_counter()
                chunk_info.summary = (await summary_content(
                    user_id=user_id,
                    model_id=model_id,
                    content=chunk_info.text
                )).summary
                summary_elapsed_ms += (time.perf_counter() - summary_start) * 1000

                reduce_start = time.perf_counter()
                final_summary_info = await reducer_summary(
                    user_id=user_id,
                    model_id=model_id,
                    current_summary=final_summary_info.summary if final_summary_info is not None else None,
                    new_summary_to_append=chunk_info.summary,
                    new_entities=sub_entities,
                    new_relations=sub_relations
                )
                reduce_elapsed_ms += (time.perf_counter() - reduce_start) * 1000
                reduce_count += 1
        info_logger.info(
            f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, node=summarize_document, "
            f"stage=summarize_chunks, chunks={chunk_count}, reduce_count={reduce_count}, "
            f"summary_mode={summary_mode}, "
            f"extract_elapsed_ms={extract_elapsed_ms:.2f}, "
            f"summary_elapsed_ms={summary_elapsed_ms:.2f}, reduce_elapsed_ms={reduce_elapsed_ms:.2f}"
        )
    finally:
        await close_extract_llm_client(llm_client)
    if final_summary_info is not None:
        state["summary"] = final_summary_info.summary
        state["title"] = final_summary_info.title
        state["description"] = final_summary_info.description
    return state


async def _mark_summarize_success(
    state: DocumentSummarizeState
) -> DocumentSummarizeState:
    document_id = state.get("document_id")
    summary = state.get("summary")
    title = state.get("title")
    description = state.get("description")
    if document_id is None:
        raise Exception("Document summarize workflow missing document_id")

    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="mark_summarize_success",
        stage_name="persist_summarize_result",
        context={
            "document_id": document_id,
            "has_summary": summary is not None,
            "has_title": title is not None,
            "has_description": description is not None,
        },
    ):
        db = session_scope()
        try:
            ensure_document_active(db=db, document_id=document_id)
            db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                db=db,
                document_id=document_id
            )
            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_summarize_task is not None:
                db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
                if summary is not None:
                    db_summarize_task.summary = summary
                db_summarize_task.update_time = datetime.now(timezone.utc)
            if db_document is not None:
                if title is not None:
                    db_document.title = title
                if description is not None:
                    db_document.description = description
            db.commit()
        finally:
            db.close()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentSummarizeState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_summarize_task",
        node_func=_init_summarize_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="prepare_summarize_context",
        node_func=_prepare_summarize_context,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="summarize_document",
        node_func=_summarize_document,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_summarize_success",
        node_func=_mark_summarize_success,
    )
    workflow.set_entry_point("init_summarize_task")
    workflow.add_edge("init_summarize_task", "prepare_summarize_context")
    workflow.add_edge("prepare_summarize_context", "summarize_document")
    workflow.add_edge("summarize_document", "mark_summarize_success")
    workflow.add_edge("mark_summarize_success", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_summarize_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_summarize_workflow(
    *,
    document_id: int,
    user_id: int,
    chunk_snapshot_path: str | None = None,
    model_id: int | None = None,
) -> None:
    workflow = get_document_summarize_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
                "chunk_snapshot_path": chunk_snapshot_path,
                "model_id": model_id,
            },
        )
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai summary: {e}")
        db = session_scope()
        try:
            db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_summarize_task is not None:
                db_summarize_task.status = DocumentSummarizeStatus.FAILED
                db_summarize_task.update_time = datetime.now(timezone.utc)
                db.commit()
        finally:
            db.close()
        raise
