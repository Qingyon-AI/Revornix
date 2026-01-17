from typing import Any, TypedDict, cast

from langgraph.graph import StateGraph, END

from data.common import stream_chunk_document, extract_entities_relations, get_extract_llm_client
import crud
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
from proxy.ai_model_proxy import AIModelProxy
from data.sql.base import SessionLocal


class GraphState(TypedDict, total=False):
    document_id: int
    user_id: int
    model_id: int
    llm_model_name: str
    llm_client: Any


async def _prepare_context(state: GraphState) -> GraphState:
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


async def _extract_chunks(state: GraphState) -> GraphState:
    llm_client = state.get("llm_client")
    llm_model = state.get("llm_model_name")
    user_id = state.get("user_id")
    document_id = state.get("document_id")
    if llm_client is None or llm_model is None or user_id is None or document_id is None:
        raise Exception("Knowledge graph workflow missing required context")
    llm_client = cast(Any, llm_client)
    llm_model = cast(str, llm_model)
    user_id = cast(int, user_id)
    document_id = cast(int, document_id)

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


def _persist_graph(state: GraphState) -> GraphState:
    document_id = state.get("document_id")
    if document_id is None:
        raise Exception("Knowledge graph workflow missing document_id")
    document_id = cast(int, document_id)
    db = SessionLocal()
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


def _build_workflow():
    workflow = StateGraph(GraphState)
    workflow.add_node("prepare_context", _prepare_context)
    workflow.add_node("extract_chunks", _extract_chunks)
    workflow.add_node("persist_graph", _persist_graph)
    workflow.set_entry_point("prepare_context")
    workflow.add_edge("prepare_context", "extract_chunks")
    workflow.add_edge("extract_chunks", "persist_graph")
    workflow.add_edge("persist_graph", END)
    return workflow.compile()


_WORKFLOW = None


def get_knowledge_graph_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_knowledge_graph_workflow(
    *,
    document_id: int,
    user_id: int,
    model_id: int
) -> None:
    workflow = get_knowledge_graph_workflow()
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
            "model_id": model_id,
        }
    )
