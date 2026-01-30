from typing import Any, TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from common.jwt_utils import create_token
from common.logger import exception_logger
from data.common import stream_chunk_document, extract_entities_relations, get_extract_llm_client
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
from data.sql.base import session_scope
from enums.ability import Ability
from enums.document import DocumentGraphStatus
from proxy.ai_model_proxy import AIModelProxy
from langfuse.openai import OpenAI


class DocumentGraphState(TypedDict, total=False):
    document_id: int
    user_id: int
    model_id: int
    llm_model_name: str
    llm_client: OpenAI


async def _init_graph_task(state: DocumentGraphState) -> DocumentGraphState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document graph workflow missing document_id or user_id")

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
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to summarize document has not set default document reader model")

        access_token, _ = create_token(
            user=db_user
        )
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.KNOWLEDGE_GRAPH.value,
            authorization=f'Bearer {access_token}'
        )
        deployed_by_official = check_deployed_by_official_in_fuc()
        if deployed_by_official and not auth_status:
            raise Exception("The user has not access to the knowledge graph ability")

        db_graph_task = crud.task.get_document_graph_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_graph_task is None:
            db_graph_task = crud.task.create_document_graph_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
            )
        if db_graph_task.status != DocumentGraphStatus.BUILDING:
            db_graph_task.status = DocumentGraphStatus.BUILDING
        db.commit()

        return {
            **state,
            "document_id": document_id,
            "user_id": user_id,
            "model_id": db_user.default_document_reader_model_id,
        }
    finally:
        db.close()


async def _prepare_context(state: DocumentGraphState) -> DocumentGraphState:
    model_id = state.get("model_id")
    user_id = state.get("user_id")
    if model_id is None or user_id is None:
        raise Exception("Knowledge graph workflow missing model_id or user_id")

    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()
    llm_client = await get_extract_llm_client(
        user_id=user_id
    )

    return {
        **state,
        "llm_model_name": model_configuration.model_name,
        "llm_client": llm_client,
    }


async def _extract_chunks(state: DocumentGraphState) -> DocumentGraphState:
    llm_client = state.get("llm_client")
    llm_model = state.get("llm_model_name")
    user_id = state.get("user_id")
    document_id = state.get("document_id")
    if llm_client is None or llm_model is None or user_id is None or document_id is None:
        raise Exception("Knowledge graph workflow missing required context")

    async for chunk_info in stream_chunk_document(doc_id=document_id):
        sub_entities, sub_relations = extract_entities_relations(
            user_id=user_id,
            llm_client=llm_client,
            llm_model=llm_model,
            chunk=chunk_info
        )
        if sub_entities:
            upsert_entities_neo4j(sub_entities)
        if sub_relations:
            upsert_relations_neo4j(sub_relations)
        upsert_chunks_neo4j(
            chunks_info=[chunk_info]
        )

    return state


def _persist_graph(state: DocumentGraphState) -> DocumentGraphState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Knowledge graph workflow missing document_id")
    db = session_scope()
    try:
        db_document = crud.document.get_document_by_document_id(
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
    finally:
        db.close()

    upsert_doc_neo4j(
        docs_info=[doc_info]
    )
    upsert_doc_chunk_relations()
    upsert_chunk_entity_relations()
    create_communities_from_chunks()
    create_community_nodes_and_relationships_with_size()
    annotate_node_degrees()
    return state


async def _mark_graph_success(state: DocumentGraphState) -> DocumentGraphState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Document graph workflow missing document_id")

    db = session_scope()
    try:
        db_graph_task = crud.task.get_document_graph_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_graph_task is not None:
            db_graph_task.status = DocumentGraphStatus.SUCCESS.value
            db.commit()
    finally:
        db.close()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentGraphState)
    workflow.add_node("init_graph_task", _init_graph_task)
    workflow.add_node("prepare_context", _prepare_context)
    workflow.add_node("extract_chunks", _extract_chunks)
    workflow.add_node("persist_graph", _persist_graph)
    workflow.add_node("mark_graph_success", _mark_graph_success)
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
    user_id: int
) -> None:
    workflow = get_document_graph_task_workflow()
    try:
        await workflow.ainvoke(
            {
                "document_id": document_id,
                "user_id": user_id,
            }
        )
    except Exception as e:
        exception_logger.error(f"Something is error while graphing document info: {e}")
        db = session_scope()
        try:
            db_graph_task = crud.task.get_document_graph_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_graph_task is not None:
                db_graph_task.status = DocumentGraphStatus.FAILED.value
                db.commit()
        finally:
            db.close()
        raise
