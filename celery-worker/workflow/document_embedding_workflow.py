import asyncio
import time
from datetime import datetime, timezone
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from common.task_detail import format_task_error
from common.embedding_utils import coerce_embedding_vectors
from data.common import stream_chunk_document
from data.milvus.insert import upsert_milvus
from data.sql.base import async_session_context
from engine.embedding.factory import get_embedding_engine
from enums.document import DocumentEmbeddingStatus
from workflow.cancelled import WorkflowCancelledError
from workflow.streaming import ParallelBatchAccumulator
from common.timing import (
    add_timed_node,
    ainvoke_with_timing,
    set_stage_metrics,
    timed_stage,
)


class DocumentEmbeddingState(TypedDict, total=False):
    document_id: int
    user_id: int
    max_chunks: int | None
    start_chunk_idx: int
    manage_task_status: bool
    chunk_snapshot_path: str | None


WORKFLOW_NAME = "document_embedding"


# 建议从 64 起步，根据吞吐/内存/接口限制调整
EMBED_BATCH_SIZE = 64


async def _ensure_embedding_task_not_cancelled(document_id: int) -> None:
    async with async_session_context() as db:
        db_embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if (
            db_embedding_task is not None
            and db_embedding_task.status == DocumentEmbeddingStatus.CANCELLED
        ):
            raise WorkflowCancelledError(
                f"Document embedding task cancelled: document_id={document_id}"
            )


def _assign_chunk_embeddings(
    *,
    chunks: list,
    vectors_raw,
) -> None:
    vectors = coerce_embedding_vectors(
        vectors_raw=vectors_raw,
        expected_count=len(chunks),
    )
    for chunk, vector in zip(chunks, vectors):
        chunk.embedding = vector


async def _init_embedding_task(
    state: DocumentEmbeddingState
) -> DocumentEmbeddingState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    manage_task_status = bool(state.get("manage_task_status", True))
    if document_id is None or user_id is None:
        raise Exception("Document embedding workflow missing document_id or user_id")
    if manage_task_status:
        await _ensure_embedding_task_not_cancelled(document_id)

    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to embedding is not found")

        # 2) 校验 user
        db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
        if db_user is None:
            raise Exception("The user which you want to summarize document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to summarize document has not set default user file system")
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to summarize document has not set default document reader model")

        if manage_task_status:
            db_embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_embedding_task is None:
                db_embedding_task = await crud.task.create_document_embedding_task_async(
                    db=db,
                    user_id=user_id,
                    document_id=document_id,
                )
            if db_embedding_task.status != DocumentEmbeddingStatus.EMBEDDING:
                db_embedding_task.status = DocumentEmbeddingStatus.EMBEDDING
                db_embedding_task.update_time = datetime.now(timezone.utc)
            db_embedding_task.detail = None
            await db.commit()
    return state


async def _embed_document(
    state: DocumentEmbeddingState
) -> DocumentEmbeddingState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    max_chunks = state.get("max_chunks")
    start_chunk_idx = int(state.get("start_chunk_idx", 0) or 0)
    chunk_snapshot_path = state.get("chunk_snapshot_path")
    if document_id is None or user_id is None:
        raise Exception("Document embedding workflow missing context")
    await _ensure_embedding_task_not_cancelled(document_id)
    embedding_engine = get_embedding_engine()

    # 批量缓存。text 由 chunk 派生而不是另存一条平行列表 —— 两条列表要靠
    # 「每处都成对 append、成对 clear」保持同步，漏掉一半就会让向量安到别的
    # 分块上，且不会报错。
    embed_batches: ParallelBatchAccumulator = ParallelBatchAccumulator(
        size=EMBED_BATCH_SIZE,
        derive=lambda chunk: chunk.text,
    )
    chunk_count = 0
    batch_count = 0
    embed_elapsed_ms = 0.0
    upsert_elapsed_ms = 0.0

    async def _embed_and_upsert_batch(
        chunks: list,
        texts: list[str],
    ) -> tuple[float, float]:
        """一批的 embed + 写入。整批和尾巴走同一段代码。

        此前这段是抄了两遍的：循环里一遍、收尾一遍。改了其中一处而忘了另一处，
        表现是文档最后那不足一批的分块用了旧逻辑 —— 不报错。
        """
        embed_start = time.perf_counter()
        vectors = await embedding_engine.embed(texts)
        embed_ms = (time.perf_counter() - embed_start) * 1000
        _assign_chunk_embeddings(
            chunks=chunks,
            vectors_raw=vectors,
        )

        upsert_start = time.perf_counter()
        await asyncio.to_thread(
            upsert_milvus,
            user_id,
            chunks,
        )
        return embed_ms, (time.perf_counter() - upsert_start) * 1000

    # 如果你想 embedding batch 和 milvus batch 分开控制，
    # 可以再做一层 milvus_buffer；这里先用“embed 批完就写 milvus”版本（最简单可靠）
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="embed_document",
        stage_name="embed_and_upsert_batches",
        context={
            "document_id": document_id,
            "user_id": user_id,
            "batch_size": EMBED_BATCH_SIZE,
            "max_chunks": max_chunks,
            "start_chunk_idx": start_chunk_idx,
            "chunk_snapshot_path": chunk_snapshot_path,
        },
    ):
        async for chunk_info in stream_chunk_document(
            doc_id=document_id,
            max_chunks=max_chunks,
            start_chunk_idx=start_chunk_idx,
            chunk_snapshot_path=chunk_snapshot_path,
            user_id=user_id,
            prefer_snapshot=True,
        ):
            chunk_count += 1

            # 满一个 embedding batch：一次 embed + 一次 upsert milvus
            batch = embed_batches.add(chunk_info)
            if batch is not None:
                batch_count += 1
                embed_ms, upsert_ms = await _embed_and_upsert_batch(*batch)
                embed_elapsed_ms += embed_ms
                upsert_elapsed_ms += upsert_ms
                await _ensure_embedding_task_not_cancelled(document_id)

        # 处理最后不足一个 batch 的尾巴
        tail_chunks, tail_texts = embed_batches.flush()
        if tail_chunks:
            batch_count += 1
            embed_ms, upsert_ms = await _embed_and_upsert_batch(tail_chunks, tail_texts)
            embed_elapsed_ms += embed_ms
            upsert_elapsed_ms += upsert_ms
    set_stage_metrics(
        chunks=chunk_count,
        batches=batch_count,
        embed_elapsed_ms=embed_elapsed_ms,
        upsert_elapsed_ms=upsert_elapsed_ms,
    )
    return state


async def _mark_embedding_success(
    state: DocumentEmbeddingState
) -> DocumentEmbeddingState:
    document_id = state.get("document_id")
    manage_task_status = bool(state.get("manage_task_status", True))
    if document_id is None:
        raise Exception("Document embedding workflow missing document_id")
    if not manage_task_status:
        return state
    await _ensure_embedding_task_not_cancelled(document_id)

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
        db_embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_embedding_task is not None:
            db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
            db_embedding_task.detail = None
            db_embedding_task.celery_task_id = None
            db_embedding_task.update_time = datetime.now(timezone.utc)
            await db.commit()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentEmbeddingState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_embedding_task",
        node_func=_init_embedding_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="embed_document",
        node_func=_embed_document,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_embedding_success",
        node_func=_mark_embedding_success,
    )
    workflow.set_entry_point("init_embedding_task")
    workflow.add_edge("init_embedding_task", "embed_document")
    workflow.add_edge("embed_document", "mark_embedding_success")
    workflow.add_edge("mark_embedding_success", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_embedding_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_embedding_workflow(
    *,
    document_id: int,
    user_id: int,
    max_chunks: int | None = None,
    start_chunk_idx: int = 0,
    manage_task_status: bool = True,
    chunk_snapshot_path: str | None = None,
) -> None:
    workflow = get_document_embedding_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
                "max_chunks": max_chunks,
                "start_chunk_idx": start_chunk_idx,
                "manage_task_status": manage_task_status,
                "chunk_snapshot_path": chunk_snapshot_path,
            },
        )
    except WorkflowCancelledError:
        if not manage_task_status:
            raise
        async with async_session_context() as db:
            db_embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_embedding_task is not None:
                db_embedding_task.status = DocumentEmbeddingStatus.CANCELLED
                db_embedding_task.detail = None
                db_embedding_task.celery_task_id = None
                db_embedding_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
    except Exception as e:
        exception_logger.error(f"Something is error while embedding document info: {e}", exc_info=True)
        if not manage_task_status:
            raise
        async with async_session_context() as db:
            db_embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if (
                db_embedding_task is not None
                and db_embedding_task.status != DocumentEmbeddingStatus.CANCELLED
            ):
                db_embedding_task.status = DocumentEmbeddingStatus.FAILED
                db_embedding_task.detail = format_task_error(e)
                db_embedding_task.celery_task_id = None
                db_embedding_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
