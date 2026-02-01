from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from data.common import stream_chunk_document
from data.milvus.insert import upsert_milvus
from data.sql.base import session_scope
from engine.embedding.factory import get_embedding_engine
from enums.document import DocumentEmbeddingStatus


class DocumentEmbeddingState(TypedDict, total=False):
    document_id: int
    user_id: int


# 建议从 64 起步，根据吞吐/内存/接口限制调整
EMBED_BATCH_SIZE = 64


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

    # 如果你想 embedding batch 和 milvus batch 分开控制，
    # 可以再做一层 milvus_buffer；这里先用“embed 批完就写 milvus”版本（最简单可靠）
    async for chunk_info in stream_chunk_document(doc_id=document_id):
        embed_chunks.append(chunk_info)
        embed_texts.append(chunk_info.text)

        # 满一个 embedding batch：一次 embed + 一次 upsert milvus
        if len(embed_chunks) >= EMBED_BATCH_SIZE:
            vectors = embedding_engine.embed(embed_texts)  # 期望返回 list/ndarray，长度=EMBED_BATCH_SIZE
            for ci, vec in zip(embed_chunks, vectors):
                ci.embedding = vec.tolist()

            upsert_milvus(
                user_id=user_id,
                chunks_info=embed_chunks
            )

            embed_chunks.clear()
            embed_texts.clear()

    # 处理最后不足一个 batch 的尾巴
    if embed_chunks:
        vectors = embedding_engine.embed(embed_texts)
        for ci, vec in zip(embed_chunks, vectors):
            ci.embedding = vec.tolist()

        upsert_milvus(
            user_id=user_id,
            chunks_info=embed_chunks
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
    workflow.add_node("init_embedding_task", _init_embedding_task)
    workflow.add_node("embed_document", _embed_document)
    workflow.add_node("mark_embedding_success", _mark_embedding_success)
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
        await workflow.ainvoke(
            {
                "document_id": document_id,
                "user_id": user_id,
            }
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
