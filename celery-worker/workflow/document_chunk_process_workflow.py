from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import reducer_summary, summary_content
from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from common.jwt_utils import create_token
from common.logger import exception_logger
from common.document_guard import ensure_document_active
from data.common import (
    extract_entities_relations,
    get_extract_llm_client,
    stream_chunk_document,
    resolve_entities_with_semantic_dedupe,
)
from data.custom_types.all import DocumentInfo, EntityInfo, RelationInfo
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
from proxy.ai_model_proxy import AIModelProxy


class DocumentChunkProcessState(TypedDict, total=False):
    document_id: int
    user_id: int
    auto_summary: bool


async def handle_process_document_chunks(
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
) -> None:
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

        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id
        )).get_configuration()

        llm_client = await get_extract_llm_client(
            user_id=user_id
        )
        entities: list[EntityInfo] = []
        relations: list[RelationInfo] = []
        existing_entities_index: dict[tuple[str, str], list[dict]] = {}
        embedding_engine = get_embedding_engine()

        final_summary_info = None
        # 4) 任务进行
        try:
            async for chunk_info in stream_chunk_document(doc_id=document_id):
                embedding = embedding_engine.embed([chunk_info.text])[0]
                chunk_info.embedding = embedding.tolist()
                sub_entities, sub_relations = extract_entities_relations(
                    user_id=user_id,
                    llm_client=llm_client,
                    llm_model=model_configuration.model_name,
                    chunk=chunk_info
                )
                if sub_entities:
                    keys = list({(e.entity_type, e.text) for e in sub_entities})
                    missing_keys = [k for k in keys if k not in existing_entities_index]
                    if missing_keys:
                        existing_entities_index.update(get_entities_by_text_and_type(missing_keys))
                    sub_entities, sub_relations = resolve_entities_with_semantic_dedupe(
                        entities=sub_entities,
                        relations=sub_relations,
                        chunk_text=chunk_info.text,
                        existing_entities_index=existing_entities_index,
                        embedding_engine=embedding_engine,
                        llm_client=llm_client,
                        llm_model=model_configuration.model_name,
                    )
                entities.extend(sub_entities)
                relations.extend(sub_relations)
                chunk_info.summary = (await summary_content(
                    user_id=user_id,
                    model_id=db_user.default_document_reader_model_id,
                    content=chunk_info.text
                )).summary
                if auto_summary:
                    final_summary_info = await reducer_summary(
                        user_id=user_id,
                        model_id=db_user.default_document_reader_model_id,
                        current_summary=final_summary_info.summary if final_summary_info is not None else None,
                        new_summary_to_append=chunk_info.summary,
                        new_entities=sub_entities,
                        new_relations=sub_relations
                    )
                upsert_milvus(
                    user_id=user_id,
                    chunks_info=[chunk_info]
                )
                upsert_chunks_neo4j(
                    chunks_info=[chunk_info]
                )
            ensure_document_active(db=db, document_id=document_id)
            db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
            if auto_summary and db_summarize_task is not None and final_summary_info is not None:
                db_summarize_task.summary = final_summary_info.summary
                db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
                db_document.title = final_summary_info.title
                db_document.description = final_summary_info.description
        except Exception as e:
            exception_logger.error(f"Something is error while embedding document info: {e}")
            db_embedding_task.status = DocumentEmbeddingStatus.FAILED
            if auto_summary and db_summarize_task is not None:
                db_summarize_task.status = DocumentSummarizeStatus.FAILED
            raise
        finally:
            db.commit()

        access_token, _ = create_token(
            user=db_user
        )
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.KNOWLEDGE_GRAPH.value,
            authorization=f"Bearer {access_token}"
        )
        deployed_by_official = check_deployed_by_official_in_fuc()
        try:
            if deployed_by_official and not auth_status:
                raise Exception("User does not have permission to build graph")
            ensure_document_active(db=db, document_id=document_id)
            upsert_doc_neo4j(
                docs_info=[
                    DocumentInfo(
                        id=db_document.id,
                        title=db_document.title,
                        description=db_document.description,
                        creator_id=db_document.creator_id,
                        update_time=db_document.update_time,
                        create_time=db_document.create_time
                    )
                ]
            )
            upsert_doc_chunk_relations()
            upsert_entities_neo4j(entities)
            upsert_relations_neo4j(relations)
            upsert_chunk_entity_relations(entities)
            create_communities_from_chunks()
            create_community_nodes_and_relationships_with_size()
            annotate_node_degrees()
            db_graph_task.status = DocumentGraphStatus.SUCCESS.value
        except Exception as e:
            exception_logger.error(f"Something is error while graphing document info: {e}")
            db_graph_task.status = DocumentGraphStatus.FAILED.value
            raise
        finally:
            db.commit()
    finally:
        db.close()


async def _process_document_chunks(
    state: DocumentChunkProcessState
) -> DocumentChunkProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document chunk workflow missing document_id or user_id")

    auto_summary = bool(state.get("auto_summary", False))

    await handle_process_document_chunks(
        document_id=document_id,
        user_id=user_id,
        auto_summary=auto_summary,
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentChunkProcessState)
    workflow.add_node("process_document_chunks", _process_document_chunks)
    workflow.set_entry_point("process_document_chunks")
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
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
            "auto_summary": auto_summary,
        }
    )
