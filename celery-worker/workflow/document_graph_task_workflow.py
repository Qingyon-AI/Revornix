import time
from datetime import datetime, timezone
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from common.jwt_utils import create_token
from common.logger import exception_logger, info_logger
from common.document_guard import ensure_document_active_async
from data.common import (
    close_extract_llm_client,
    stream_chunk_document,
    extract_entities_relations,
    get_extract_llm_client,
    resolve_entities_with_semantic_dedupe,
)
from data.custom_types.all import DocumentInfo
from data.neo4j.insert import (
    upsert_entities_neo4j,
    upsert_relations_neo4j,
    upsert_chunk_entity_relations,
    create_communities_from_chunks,
    create_community_nodes_and_relationships_with_size,
    annotate_node_degrees,
    upsert_chunks_neo4j,
    upsert_doc_chunk_relations,
    upsert_doc_neo4j,
)
from data.neo4j.search import get_entities_by_text_and_type
from engine.embedding.factory import get_embedding_engine
from data.sql.base import async_session_context
from enums.ability import Ability
from enums.document import DocumentGraphStatus
from enums.user import UserRole
from proxy.ai_model_proxy import AIModelProxy
from workflow.cancelled import WorkflowCancelledError
from workflow.timing import add_timed_node, ainvoke_with_timing, format_elapsed_fields, timed_stage


class DocumentGraphState(TypedDict, total=False):
    document_id: int
    user_id: int
    model_id: int
    llm_model_name: str
    chunk_snapshot_path: str | None


WORKFLOW_NAME = "document_graph_task"


async def _ensure_graph_task_not_cancelled(document_id: int) -> None:
    async with async_session_context() as db:
        db_graph_task = await crud.task.get_document_graph_task_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if (
            db_graph_task is not None
            and db_graph_task.status == DocumentGraphStatus.CANCELLED
        ):
            raise WorkflowCancelledError(
                f"Document graph task cancelled: document_id={document_id}"
            )

async def _init_graph_task(state: DocumentGraphState) -> DocumentGraphState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document graph workflow missing document_id or user_id")
    await _ensure_graph_task_not_cancelled(document_id)

    model_id: int | None = state.get("model_id")
    access_token: str | None = None
    deployed_by_official = check_deployed_by_official_in_fuc()
    is_admin_or_root = False

    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to summarize is not found")

        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to summarize document is not found")
        is_admin_or_root = db_user.role in (UserRole.ADMIN, UserRole.ROOT)
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to summarize document has not set default user file system")
        if model_id is None and db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to summarize document has not set default document reader model")
        if deployed_by_official and not is_admin_or_root:
            access_token, _ = create_token(
                user=db_user
            )
        if model_id is None:
            model_id = db_user.default_document_reader_model_id
    if deployed_by_official and not is_admin_or_root:
        if access_token is None:
            raise Exception("Failed to create access token for graph permission check")
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.KNOWLEDGE_GRAPH.value,
            authorization=f'Bearer {access_token}'
        )
        if not auth_status:
            raise Exception("The user has not access to the knowledge graph ability")

    async with async_session_context() as db:
        await ensure_document_active_async(db=db, document_id=document_id)
        db_graph_task = await crud.task.get_document_graph_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_graph_task is None:
            db_graph_task = await crud.task.create_document_graph_task_async(
                db=db,
                user_id=user_id,
                document_id=document_id,
            )
        if db_graph_task.status != DocumentGraphStatus.BUILDING:
            db_graph_task.status = DocumentGraphStatus.BUILDING
            db_graph_task.update_time = datetime.now(timezone.utc)
        await db.commit()

    if model_id is None:
        raise Exception("The user which you want to summarize document has not set default document reader model")

    return {
        **state,
        "document_id": document_id,
        "user_id": user_id,
        "model_id": model_id,
    }


async def _prepare_context(state: DocumentGraphState) -> DocumentGraphState:
    model_id = state.get("model_id")
    user_id = state.get("user_id")
    if model_id is None or user_id is None:
        raise Exception("Knowledge graph workflow missing model_id or user_id")

    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()
    return {
        **state,
        "llm_model_name": model_configuration.model_name,
    }


async def _extract_chunks(state: DocumentGraphState) -> DocumentGraphState:
    llm_model = state.get("llm_model_name")
    user_id = state.get("user_id")
    document_id = state.get("document_id")
    chunk_snapshot_path = state.get("chunk_snapshot_path")
    if llm_model is None or user_id is None or document_id is None:
        raise Exception("Knowledge graph workflow missing required context")
    await _ensure_graph_task_not_cancelled(document_id)

    llm_client = await get_extract_llm_client(
        user_id=user_id
    )
    existing_entities_index: dict[tuple[str, str], list[dict]] = {}
    embedding_engine = get_embedding_engine()
    chunk_count = 0
    extracted_entities_count = 0
    extracted_relations_count = 0
    dedupe_elapsed_ms = 0.0
    upsert_elapsed_ms = 0.0
    try:
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="extract_chunks",
            stage_name="extract_and_upsert_chunks",
            context={
                "document_id": document_id,
                "user_id": user_id,
                "chunk_snapshot_path": chunk_snapshot_path,
            },
        ):
            async for chunk_info in stream_chunk_document(
                doc_id=document_id,
                chunk_snapshot_path=chunk_snapshot_path,
                user_id=user_id,
                prefer_snapshot=True,
            ):
                chunk_count += 1
                sub_entities, sub_relations = await extract_entities_relations(
                    user_id=user_id,
                    llm_client=llm_client,
                    llm_model=llm_model,
                    chunk=chunk_info
                )
                if sub_entities:
                    keys = list({(e.entity_type, e.text) for e in sub_entities})
                    missing_keys = [k for k in keys if k not in existing_entities_index]
                    if missing_keys:
                        existing_entities_index.update(await get_entities_by_text_and_type(missing_keys))
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

                extracted_entities_count += len(sub_entities)
                extracted_relations_count += len(sub_relations)

                upsert_start = time.perf_counter()
                await upsert_chunks_neo4j(
                    chunks_info=[chunk_info]
                )
                if sub_entities:
                    await upsert_entities_neo4j(sub_entities)
                if sub_relations:
                    await upsert_relations_neo4j(sub_relations)
                if sub_entities:
                    await upsert_chunk_entity_relations(sub_entities)
                upsert_elapsed_ms += (time.perf_counter() - upsert_start) * 1000
                await _ensure_graph_task_not_cancelled(document_id)
        info_logger.info(
            f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, node=extract_chunks, "
            f"stage=extract_and_upsert_chunks, chunks={chunk_count}, "
            f"entities={extracted_entities_count}, relations={extracted_relations_count}, "
            f"{format_elapsed_fields(dedupe_elapsed_ms, field_prefix='dedupe_elapsed')}, "
            f"{format_elapsed_fields(upsert_elapsed_ms, field_prefix='upsert_elapsed')}"
        )
    finally:
        await close_extract_llm_client(llm_client)

    return state


async def _persist_graph(state: DocumentGraphState) -> DocumentGraphState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Knowledge graph workflow missing document_id")
    await _ensure_graph_task_not_cancelled(document_id)
    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("Document not found while persisting graph")
        doc_info = DocumentInfo(
            id=db_document.id,
            title=db_document.title,
            description=db_document.description,
            creator_id=db_document.creator_id,
            update_time=db_document.update_time,
            create_time=db_document.create_time
        )
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="persist_graph",
        stage_name="upsert_doc",
        context={"document_id": document_id},
    ):
        await upsert_doc_neo4j(
            docs_info=[doc_info]
        )
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="persist_graph",
        stage_name="upsert_doc_chunk_relations",
        context={"document_id": document_id},
    ):
        await upsert_doc_chunk_relations()
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="persist_graph",
        stage_name="upsert_chunk_entity_relations",
        context={"document_id": document_id},
    ):
        await upsert_chunk_entity_relations()
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="persist_graph",
        stage_name="build_communities",
        context={"document_id": document_id},
    ):
        await create_communities_from_chunks()
        await create_community_nodes_and_relationships_with_size()
        await annotate_node_degrees()
    return state


async def _mark_graph_success(state: DocumentGraphState) -> DocumentGraphState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Document graph workflow missing document_id")
    await _ensure_graph_task_not_cancelled(document_id)

    async with async_session_context() as db:
        await ensure_document_active_async(db=db, document_id=document_id)
        db_graph_task = await crud.task.get_document_graph_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_graph_task is not None:
            db_graph_task.status = DocumentGraphStatus.SUCCESS.value
            db_graph_task.celery_task_id = None
            db_graph_task.update_time = datetime.now(timezone.utc)
            await db.commit()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentGraphState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_graph_task",
        node_func=_init_graph_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="prepare_context",
        node_func=_prepare_context,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="extract_chunks",
        node_func=_extract_chunks,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="persist_graph",
        node_func=_persist_graph,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_graph_success",
        node_func=_mark_graph_success,
    )
    workflow.set_entry_point("init_graph_task")
    workflow.add_edge("init_graph_task", "prepare_context")
    workflow.add_edge("prepare_context", "extract_chunks")
    workflow.add_edge("extract_chunks", "persist_graph")
    workflow.add_edge("persist_graph", "mark_graph_success")
    workflow.add_edge("mark_graph_success", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_graph_task_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_graph_task_workflow(
    *,
    document_id: int,
    user_id: int,
    chunk_snapshot_path: str | None = None,
    model_id: int | None = None,
) -> None:
    workflow = get_document_graph_task_workflow()
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
    except WorkflowCancelledError:
        async with async_session_context() as db:
            db_graph_task = await crud.task.get_document_graph_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_graph_task is not None:
                db_graph_task.status = DocumentGraphStatus.CANCELLED.value
                db_graph_task.celery_task_id = None
                db_graph_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
    except Exception as e:
        exception_logger.error(f"Something is error while graphing document info: {e}")
        async with async_session_context() as db:
            db_graph_task = await crud.task.get_document_graph_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if (
                db_graph_task is not None
                and db_graph_task.status != DocumentGraphStatus.CANCELLED.value
            ):
                db_graph_task.status = DocumentGraphStatus.FAILED.value
                db_graph_task.celery_task_id = None
                db_graph_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
