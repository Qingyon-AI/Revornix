from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import reducer_summary, summary_content
from common.logger import exception_logger
from common.document_guard import ensure_document_active
from data.common import extract_entities_relations, get_extract_llm_client, stream_chunk_document
from data.sql.base import session_scope
from enums.document import DocumentSummarizeStatus
from proxy.ai_model_proxy import AIModelProxy


class DocumentSummarizeState(TypedDict, total=False):
    document_id: int
    user_id: int
    model_id: int
    llm_model_name: str
    summary: str
    title: str
    description: str


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
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to summarize document has not set default document reader model")
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
    if document_id is None or user_id is None or model_id is None or llm_model is None:
        raise Exception("Document summarize workflow missing context")

    llm_client = await get_extract_llm_client(
        user_id=user_id
    )
    final_summary_info = None
    async for chunk_info in stream_chunk_document(doc_id=document_id):
        sub_entities, sub_relations = extract_entities_relations(
            user_id=user_id,
            llm_client=llm_client,
            llm_model=llm_model,
            chunk=chunk_info
        )
        chunk_info.summary = (await summary_content(
            user_id=user_id,
            model_id=model_id,
            content=chunk_info.text
        )).summary
        final_summary_info = await reducer_summary(
            user_id=user_id,
            model_id=model_id,
            current_summary=final_summary_info.summary if final_summary_info is not None else None,
            new_summary_to_append=chunk_info.summary,
            new_entities=sub_entities,
            new_relations=sub_relations
        )
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

    if summary is None or title is None or description is None:
        return state

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
            db_summarize_task.summary = summary
            db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
        if db_document is not None:
            db_document.title = title
            db_document.description = description
        db.commit()
    finally:
        db.close()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentSummarizeState)
    workflow.add_node("init_summarize_task", _init_summarize_task)
    workflow.add_node("prepare_summarize_context", _prepare_summarize_context)
    workflow.add_node("summarize_document", _summarize_document)
    workflow.add_node("mark_summarize_success", _mark_summarize_success)
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
    user_id: int
) -> None:
    workflow = get_document_summarize_workflow()
    try:
        await workflow.ainvoke(
            {
                "document_id": document_id,
                "user_id": user_id,
            }
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
                db.commit()
        finally:
            db.close()
        raise
