import asyncio
import time
from dataclasses import dataclass
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import (
    SummaryResultWithTitleAndDescription,
    reducer_summary,
    summary_content,
)
from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from common.embedding_utils import extract_single_embedding_vector
from common.jwt_utils import create_token
from common.logger import exception_logger, info_logger
from common.document_guard import ensure_document_active
from data.common import (
    close_extract_llm_client,
    extract_entities_relations,
    get_extract_llm_client,
    resolve_entities_with_semantic_dedupe,
    stream_chunk_document,
)
from data.custom_types.all import ChunkInfo, DocumentInfo, EntityInfo, RelationInfo
from data.milvus.insert import upsert_milvus
from data.neo4j.insert import (
    annotate_node_degrees,
    create_communities_from_chunks,
    create_community_nodes_and_relationships_with_size,
    upsert_chunk_entity_relations,
    upsert_chunks_neo4j,
    upsert_doc_chunk_relations,
    upsert_doc_neo4j,
    upsert_entities_neo4j,
    upsert_relations_neo4j,
)
from data.neo4j.search import get_entities_by_text_and_type
from data.sql.base import session_scope
from engine.embedding.factory import get_embedding_engine
from enums.ability import Ability
from enums.document import (
    DocumentEmbeddingStatus,
    DocumentGraphStatus,
    DocumentSummarizeStatus,
)
from enums.user import UserRole
from proxy.ai_model_proxy import AIModelProxy
from workflow.timing import add_timed_node, ainvoke_with_timing, timed_stage


class DocumentChunkProcessState(TypedDict, total=False):
    document_id: int
    user_id: int
    auto_summary: bool
    model_id: int
    llm_model_name: str


WORKFLOW_NAME = "document_chunk_process"


CHUNK_PREPROCESS_CONCURRENCY = 4
CHUNK_UPSERT_BATCH_SIZE = 24
SUMMARY_REDUCE_BATCH_SIZE = 6


@dataclass
class ChunkPreprocessResult:
    chunk_info: ChunkInfo
    sub_entities: list[EntityInfo]
    sub_relations: list[RelationInfo]


def _flush_chunk_upserts(
    *,
    user_id: int,
    chunks_info: list[ChunkInfo],
) -> None:
    if not chunks_info:
        return

    start = time.perf_counter()
    upsert_milvus(
        user_id=user_id,
        chunks_info=chunks_info,
    )
    upsert_chunks_neo4j(
        chunks_info=chunks_info,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000
    info_logger.info(
        f"[WorkflowTiming] stage_end workflow={WORKFLOW_NAME}, node=process_document_chunks, "
        f"stage=flush_chunk_upserts, elapsed_ms={elapsed_ms:.2f}, batch_size={len(chunks_info)}"
    )


async def _reduce_summary_batch(
    *,
    user_id: int,
    model_id: int,
    current_summary_info: SummaryResultWithTitleAndDescription | None,
    reduce_items: list[tuple[str, list[EntityInfo], list[RelationInfo]]],
) -> SummaryResultWithTitleAndDescription | None:
    merged_summaries = [item[0] for item in reduce_items if item[0].strip()]
    if not merged_summaries:
        return current_summary_info

    merged_entities = [
        entity
        for _, entities, _ in reduce_items
        for entity in entities
    ]
    merged_relations = [
        relation
        for _, _, relations in reduce_items
        for relation in relations
    ]

    return await reducer_summary(
        user_id=user_id,
        model_id=model_id,
        current_summary=(
            current_summary_info.summary
            if current_summary_info is not None
            else None
        ),
        new_summary_to_append="\n\n".join(merged_summaries),
        new_entities=merged_entities,
        new_relations=merged_relations,
    )


async def _preprocess_chunk(
    *,
    user_id: int,
    model_id: int,
    llm_model: str,
    llm_client,
    embedding_engine,
    chunk_info: ChunkInfo,
) -> ChunkPreprocessResult:
    embedding_raw = await asyncio.to_thread(
        embedding_engine.embed,
        [chunk_info.text],
    )
    chunk_info.embedding = extract_single_embedding_vector(embedding_raw)

    sub_entities, sub_relations = await extract_entities_relations(
        user_id,
        llm_client,
        llm_model,
        chunk_info,
    )

    chunk_info.summary = (await summary_content(
        user_id=user_id,
        model_id=model_id,
        content=chunk_info.text,
    )).summary

    return ChunkPreprocessResult(
        chunk_info=chunk_info,
        sub_entities=sub_entities,
        sub_relations=sub_relations,
    )


def _mark_chunk_related_tasks_failed(
    *,
    document_id: int,
    auto_summary: bool,
) -> None:
    db = session_scope()
    try:
        db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_embedding_task is not None:
            db_embedding_task.status = DocumentEmbeddingStatus.FAILED

        if auto_summary:
            db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_summarize_task is not None:
                db_summarize_task.status = DocumentSummarizeStatus.FAILED

        db_graph_task = crud.task.get_document_graph_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_graph_task is not None:
            db_graph_task.status = DocumentGraphStatus.FAILED
        db.commit()
    finally:
        db.close()


def _set_graph_task_status(
    *,
    document_id: int,
    status: DocumentGraphStatus,
    check_document_active: bool = False,
) -> None:
    db = session_scope()
    try:
        if check_document_active:
            ensure_document_active(db=db, document_id=document_id)
        db_graph_task = crud.task.get_document_graph_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_graph_task is not None:
            db_graph_task.status = status
            db.commit()
    finally:
        db.close()


async def _init_chunk_tasks(
    state: DocumentChunkProcessState
) -> DocumentChunkProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document chunk workflow missing document_id or user_id")

    db = session_scope()
    try:
        # 1) 校验 document
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")

        # 2) 校验 user
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to process document has not set default document reader model")

        state["model_id"] = db_user.default_document_reader_model_id

        # 3) 获取/创建任务记录，置为 进行时
        db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_embedding_task is None:
            db_embedding_task = crud.task.create_document_embedding_task(
                db=db,
                user_id=user_id,
                document_id=document_id
            )
        if db_embedding_task.status != DocumentEmbeddingStatus.EMBEDDING:
            db_embedding_task.status = DocumentEmbeddingStatus.EMBEDDING
        db_summarize_task = None
        auto_summary = bool(state.get("auto_summary", False))
        if auto_summary:
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
        db_graph_task = crud.task.get_document_graph_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_graph_task is None:
            db_graph_task = crud.task.create_document_graph_task(
                db=db,
                user_id=user_id,
                document_id=document_id
            )
        if db_graph_task.status != DocumentGraphStatus.BUILDING:
            db_graph_task.status = DocumentGraphStatus.BUILDING
        db.commit()
    finally:
        db.close()
    return state


async def _prepare_chunk_context(
    state: DocumentChunkProcessState
) -> DocumentChunkProcessState:
    user_id = state.get("user_id")
    model_id = state.get("model_id")
    if user_id is None or model_id is None:
        raise Exception("Document chunk workflow missing model_id or user_id")

    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()

    state["llm_model_name"] = model_configuration.model_name
    return state


async def _process_document_chunks(
    state: DocumentChunkProcessState
) -> DocumentChunkProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    auto_summary = bool(state.get("auto_summary", False))
    model_id = state.get("model_id")
    llm_model = state.get("llm_model_name")
    if document_id is None or user_id is None or model_id is None or llm_model is None:
        raise Exception("Document chunk workflow missing context")

    llm_client = await get_extract_llm_client(
        user_id=user_id
    )
    embedding_engine = get_embedding_engine()
    entities: list[EntityInfo] = []
    relations: list[RelationInfo] = []
    existing_entities_index: dict[tuple[str, str], list[dict]] = {}
    final_summary_info: SummaryResultWithTitleAndDescription | None = None
    chunk_upsert_batch: list[ChunkInfo] = []
    summary_reduce_buffer: list[tuple[str, list[EntityInfo], list[RelationInfo]]] = []
    preprocess_semaphore = asyncio.Semaphore(CHUNK_PREPROCESS_CONCURRENCY)
    pending_tasks: set[asyncio.Task[ChunkPreprocessResult]] = set()
    ready_results: dict[int, ChunkPreprocessResult] = {}
    next_chunk_idx = 0
    processed_chunks = 0
    extracted_entities_total = 0
    extracted_relations_total = 0
    dedupe_elapsed_ms = 0.0
    summary_reduce_elapsed_ms = 0.0
    summary_reduce_batches = 0

    async def _consume_preprocessed_result(
        result: ChunkPreprocessResult,
    ) -> None:
        nonlocal final_summary_info
        nonlocal processed_chunks
        nonlocal extracted_entities_total
        nonlocal extracted_relations_total
        nonlocal dedupe_elapsed_ms
        nonlocal summary_reduce_elapsed_ms
        nonlocal summary_reduce_batches
        sub_entities = result.sub_entities
        sub_relations = result.sub_relations
        chunk_info = result.chunk_info

        if sub_entities:
            keys = list({(e.entity_type, e.text) for e in sub_entities})
            missing_keys = [k for k in keys if k not in existing_entities_index]
            if missing_keys:
                existing_entities_index.update(get_entities_by_text_and_type(missing_keys))
            dedupe_start = time.perf_counter()
            sub_entities, sub_relations = await resolve_entities_with_semantic_dedupe(
                entities=sub_entities,
                relations=sub_relations,
                chunk_text=chunk_info.text,
                existing_entities_index=existing_entities_index,
                embedding_engine=embedding_engine,
                llm_client=llm_client,
                llm_model=llm_model,
            )
            dedupe_elapsed_ms += (time.perf_counter() - dedupe_start) * 1000

        entities.extend(sub_entities)
        relations.extend(sub_relations)
        processed_chunks += 1
        extracted_entities_total += len(sub_entities)
        extracted_relations_total += len(sub_relations)

        chunk_upsert_batch.append(chunk_info)
        if len(chunk_upsert_batch) >= CHUNK_UPSERT_BATCH_SIZE:
            _flush_chunk_upserts(
                user_id=user_id,
                chunks_info=chunk_upsert_batch,
            )
            chunk_upsert_batch.clear()

        if not auto_summary:
            return

        summary_reduce_buffer.append(
            (
                chunk_info.summary or "",
                sub_entities,
                sub_relations,
            )
        )
        if len(summary_reduce_buffer) < SUMMARY_REDUCE_BATCH_SIZE:
            return

        summary_reduce_start = time.perf_counter()
        final_summary_info = await _reduce_summary_batch(
            user_id=user_id,
            model_id=model_id,
            current_summary_info=final_summary_info,
            reduce_items=summary_reduce_buffer,
        )
        summary_reduce_elapsed_ms += (time.perf_counter() - summary_reduce_start) * 1000
        summary_reduce_batches += 1
        summary_reduce_buffer.clear()

    # 4) 任务进行
    try:
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="chunk_preprocess_pipeline",
            context={
                "document_id": document_id,
                "user_id": user_id,
                "auto_summary": auto_summary,
            },
        ):
            async def _run_preprocess(
                chunk_info: ChunkInfo,
            ) -> ChunkPreprocessResult:
                async with preprocess_semaphore:
                    return await _preprocess_chunk(
                        user_id=user_id,
                        model_id=model_id,
                        llm_model=llm_model,
                        llm_client=llm_client,
                        embedding_engine=embedding_engine,
                        chunk_info=chunk_info,
                    )

            async for chunk_info in stream_chunk_document(doc_id=document_id):
                pending_tasks.add(asyncio.create_task(_run_preprocess(chunk_info)))
                if len(pending_tasks) < CHUNK_PREPROCESS_CONCURRENCY:
                    continue

                done, pending_tasks = await asyncio.wait(
                    pending_tasks,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for done_task in done:
                    result = done_task.result()
                    ready_results[result.chunk_info.idx] = result

                while next_chunk_idx in ready_results:
                    await _consume_preprocessed_result(ready_results.pop(next_chunk_idx))
                    next_chunk_idx += 1

            while pending_tasks:
                done, pending_tasks = await asyncio.wait(
                    pending_tasks,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for done_task in done:
                    result = done_task.result()
                    ready_results[result.chunk_info.idx] = result

                while next_chunk_idx in ready_results:
                    await _consume_preprocessed_result(ready_results.pop(next_chunk_idx))
                    next_chunk_idx += 1

            if ready_results:
                for idx in sorted(ready_results):
                    await _consume_preprocessed_result(ready_results[idx])

            if chunk_upsert_batch:
                _flush_chunk_upserts(
                    user_id=user_id,
                    chunks_info=chunk_upsert_batch,
                )
                chunk_upsert_batch.clear()

            if auto_summary and summary_reduce_buffer:
                summary_reduce_start = time.perf_counter()
                final_summary_info = await _reduce_summary_batch(
                    user_id=user_id,
                    model_id=model_id,
                    current_summary_info=final_summary_info,
                    reduce_items=summary_reduce_buffer,
                )
                summary_reduce_elapsed_ms += (time.perf_counter() - summary_reduce_start) * 1000
                summary_reduce_batches += 1
                summary_reduce_buffer.clear()

        info_logger.info(
            f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, node=process_document_chunks, "
            f"stage=chunk_preprocess_pipeline, chunks={processed_chunks}, "
            f"entities={extracted_entities_total}, relations={extracted_relations_total}, "
            f"summary_reduce_batches={summary_reduce_batches}, "
            f"summary_reduce_elapsed_ms={summary_reduce_elapsed_ms:.2f}, "
            f"dedupe_elapsed_ms={dedupe_elapsed_ms:.2f}"
        )
    except Exception as e:
        for pending_task in pending_tasks:
            pending_task.cancel()
        if pending_tasks:
            await asyncio.gather(*pending_tasks, return_exceptions=True)
        exception_logger.error(f"Something is error while embedding document info: {e}")
        try:
            _mark_chunk_related_tasks_failed(
                document_id=document_id,
                auto_summary=auto_summary
            )
        except Exception as status_error:
            exception_logger.error(f"Failed to update chunk-related task status: {status_error}")
        raise
    finally:
        await close_extract_llm_client(llm_client)

    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="process_document_chunks",
        stage_name="persist_chunk_task_status",
        context={
            "document_id": document_id,
            "auto_summary": auto_summary,
            "has_summary": final_summary_info is not None,
        },
    ):
        db = session_scope()
        try:
            ensure_document_active(db=db, document_id=document_id)
            db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_embedding_task is not None:
                db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
            if auto_summary:
                db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                    db=db,
                    document_id=document_id
                )
                if db_summarize_task is not None:
                    db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
                    if final_summary_info is not None:
                        db_summarize_task.summary = final_summary_info.summary
                if final_summary_info is not None:
                    db_document = crud.document.get_document_by_document_id(
                        db=db,
                        document_id=document_id
                    )
                    if db_document is not None:
                        db_document.title = final_summary_info.title
                        db_document.description = final_summary_info.description
            db.commit()
        except Exception:
            try:
                _mark_chunk_related_tasks_failed(
                    document_id=document_id,
                    auto_summary=auto_summary
                )
            except Exception as status_error:
                exception_logger.error(f"Failed to update chunk-related task status: {status_error}")
            raise
        finally:
            db.close()

    # 5) 图谱构建
    deployed_by_official = check_deployed_by_official_in_fuc()
    access_token: str | None = None
    doc_info: DocumentInfo | None = None
    is_admin_or_root = False
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="process_document_chunks",
        stage_name="load_graph_context",
        context={
            "document_id": document_id,
            "user_id": user_id,
            "deployed_by_official": deployed_by_official,
        },
    ):
        db = session_scope()
        try:
            ensure_document_active(db=db, document_id=document_id)
            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document is None:
                raise Exception("The document you want to process is not found")

            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=user_id
            )
            if db_user is None:
                raise Exception("The user which you want to process document is not found")

            is_admin_or_root = db_user.role in (UserRole.ADMIN, UserRole.ROOT)

            if deployed_by_official and not is_admin_or_root:
                access_token, _ = create_token(
                    user=db_user
                )

            doc_info = DocumentInfo(
                id=db_document.id,
                title=db_document.title,
                description=db_document.description,
                creator_id=db_document.creator_id,
                update_time=db_document.update_time,
                create_time=db_document.create_time
            )
        finally:
            db.close()

    auth_status = True
    if deployed_by_official and not is_admin_or_root:
        if access_token is None:
            raise Exception("Failed to create access token for graph permission check")
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="check_graph_permission",
            context={
                "document_id": document_id,
                "ability": Ability.KNOWLEDGE_GRAPH.value,
            },
        ):
            auth_status = await plan_ability_checked_in_func(
                ability=Ability.KNOWLEDGE_GRAPH.value,
                authorization=f"Bearer {access_token}"
            )

    try:
        if deployed_by_official and not is_admin_or_root and not auth_status:
            raise Exception("User does not have permission to build graph")
        if doc_info is None:
            raise Exception("The document info for graph build is missing")
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="graph_upsert_doc",
            context={"document_id": document_id},
        ):
            upsert_doc_neo4j(
                docs_info=[doc_info]
            )
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="graph_upsert_doc_chunk_relations",
            context={"document_id": document_id},
        ):
            upsert_doc_chunk_relations()
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="graph_upsert_entities",
            context={
                "document_id": document_id,
                "entities_count": len(entities),
            },
        ):
            upsert_entities_neo4j(entities)
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="graph_upsert_relations",
            context={
                "document_id": document_id,
                "relations_count": len(relations),
            },
        ):
            upsert_relations_neo4j(relations)
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="graph_upsert_chunk_entity_relations",
            context={
                "document_id": document_id,
                "entities_count": len(entities),
            },
        ):
            upsert_chunk_entity_relations(entities)
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="graph_build_communities",
            context={"document_id": document_id},
        ):
            create_communities_from_chunks()
            create_community_nodes_and_relationships_with_size()
            annotate_node_degrees()
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="process_document_chunks",
            stage_name="mark_graph_success",
            context={"document_id": document_id},
        ):
            _set_graph_task_status(
                document_id=document_id,
                status=DocumentGraphStatus.SUCCESS,
                check_document_active=True,
            )
    except Exception as e:
        exception_logger.error(f"Something is error while graphing document info: {e}")
        try:
            _set_graph_task_status(
                document_id=document_id,
                status=DocumentGraphStatus.FAILED
            )
        except Exception as status_error:
            exception_logger.error(f"Failed to update graph task status: {status_error}")
        raise

    return state


def _build_workflow():
    workflow = StateGraph(DocumentChunkProcessState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_chunk_tasks",
        node_func=_init_chunk_tasks,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="prepare_chunk_context",
        node_func=_prepare_chunk_context,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="process_document_chunks",
        node_func=_process_document_chunks,
    )
    workflow.set_entry_point("init_chunk_tasks")
    workflow.add_edge("init_chunk_tasks", "prepare_chunk_context")
    workflow.add_edge("prepare_chunk_context", "process_document_chunks")
    workflow.add_edge("process_document_chunks", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_chunk_process_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_chunk_process_workflow(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
) -> None:
    workflow = get_document_chunk_process_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
                "auto_summary": auto_summary,
            },
        )
    except Exception as e:
        exception_logger.error(f"Something is error while processing document chunks: {e}")
        raise
