import asyncio
import time
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger, info_logger
from common.document_guard import ensure_document_active
from common.embedding_utils import coerce_embedding_vectors
from data.common import stream_chunk_document
from data.milvus.insert import upsert_milvus
from data.sql.base import session_scope
from engine.embedding.factory import get_embedding_engine
from enums.document import DocumentEmbeddingStatus
from workflow.timing import add_timed_node, ainvoke_with_timing, timed_stage


class DocumentEmbeddingState(TypedDict, total=False):
    document_id: int
    user_id: int


WORKFLOW_NAME = "document_embedding"


# 建议从 64 起步，根据吞吐/内存/接口限制调整
EMBED_BATCH_SIZE = 64


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
    if document_id is None or user_id is None:
        raise Exception("Document embedding workflow missing document_id or user_id")

    db = session_scope()
    try:
        # 1) 校验 document
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to embedding is not found")

        # 2) 校验 user
        db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
        if db_user is None:
            raise Exception("The user which you want to summarize document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to summarize document has not set default user file system")
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to summarize document has not set default document reader model")

        # 3) 获取/创建任务记录，置为 EMBEDDING
        db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_embedding_task is None:
            db_embedding_task = crud.task.create_document_embedding_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
            )
        if db_embedding_task.status != DocumentEmbeddingStatus.EMBEDDING:
            db_embedding_task.status = DocumentEmbeddingStatus.EMBEDDING
        db.commit()
    finally:
        db.close()
    return state


async def _embed_document(
    state: DocumentEmbeddingState
) -> DocumentEmbeddingState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document embedding workflow missing context")
    embedding_engine = get_embedding_engine()

    # 批量缓存
    embed_chunks: list = []
    embed_texts: list[str] = []
    chunk_count = 0
    batch_count = 0
    embed_elapsed_ms = 0.0
    upsert_elapsed_ms = 0.0

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
        },
    ):
        async for chunk_info in stream_chunk_document(doc_id=document_id):
            chunk_count += 1
            embed_chunks.append(chunk_info)
            embed_texts.append(chunk_info.text)

            # 满一个 embedding batch：一次 embed + 一次 upsert milvus
            if len(embed_chunks) >= EMBED_BATCH_SIZE:
                batch_count += 1
                embed_start = time.perf_counter()
                vectors = await asyncio.to_thread(embedding_engine.embed, embed_texts)
                embed_elapsed_ms += (time.perf_counter() - embed_start) * 1000
                _assign_chunk_embeddings(
                    chunks=embed_chunks,
                    vectors_raw=vectors,
                )

                upsert_start = time.perf_counter()
                await asyncio.to_thread(
                    upsert_milvus,
                    user_id,
                    embed_chunks,
                )
                upsert_elapsed_ms += (time.perf_counter() - upsert_start) * 1000

                embed_chunks.clear()
                embed_texts.clear()

        # 处理最后不足一个 batch 的尾巴
        if embed_chunks:
            batch_count += 1
            embed_start = time.perf_counter()
            vectors = await asyncio.to_thread(embedding_engine.embed, embed_texts)
            embed_elapsed_ms += (time.perf_counter() - embed_start) * 1000
            _assign_chunk_embeddings(
                chunks=embed_chunks,
                vectors_raw=vectors,
            )

            upsert_start = time.perf_counter()
            await asyncio.to_thread(
                upsert_milvus,
                user_id,
                embed_chunks,
            )
            upsert_elapsed_ms += (time.perf_counter() - upsert_start) * 1000
    info_logger.info(
        f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, node=embed_document, "
        f"stage=embed_and_upsert_batches, chunks={chunk_count}, batches={batch_count}, "
        f"embed_elapsed_ms={embed_elapsed_ms:.2f}, upsert_elapsed_ms={upsert_elapsed_ms:.2f}"
    )
    return state


async def _mark_embedding_success(
    state: DocumentEmbeddingState
) -> DocumentEmbeddingState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Document embedding workflow missing document_id")

    db = session_scope()
    try:
        ensure_document_active(db=db, document_id=document_id)
        db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_embedding_task is not None:
            db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
            db.commit()
    finally:
        db.close()
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
    user_id: int
) -> None:
    workflow = get_document_embedding_workflow()
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
        exception_logger.error(f"Something is error while embedding document info: {e}", exc_info=True)
        db = session_scope()
        try:
            db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_embedding_task is not None:
                db_embedding_task.status = DocumentEmbeddingStatus.FAILED
                db.commit()
        finally:
            db.close()
        raise
