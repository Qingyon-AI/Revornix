from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import reducer_summary, summary_content
from common.logger import exception_logger
from data.common import extract_entities_relations, get_extract_llm_client, stream_chunk_document
from data.sql.base import SessionLocal
from enums.document import DocumentSummarizeStatus
from proxy.ai_model_proxy import AIModelProxy


class DocumentSummarizeState(TypedDict, total=False):
    document_id: int
    user_id: int


async def handle_update_document_ai_summarize(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
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

        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id
        )).get_configuration()

        llm_client = await get_extract_llm_client(
            user_id=user_id
        )
        final_summary_info = None

        async for chunk_info in stream_chunk_document(doc_id=document_id):
            sub_entities, sub_relations = extract_entities_relations(
                user_id=user_id,
                llm_client=llm_client,
                llm_model=model_configuration.model_name,
                chunk=chunk_info
            )
            chunk_info.summary = (await summary_content(
                user_id=user_id,
                model_id=db_user.default_document_reader_model_id,
                content=chunk_info.text
            )).summary
            final_summary_info = await reducer_summary(
                user_id=user_id,
                model_id=db_user.default_document_reader_model_id,
                current_summary=final_summary_info.summary if final_summary_info is not None else None,
                new_summary_to_append=chunk_info.summary,
                new_entities=sub_entities,
                new_relations=sub_relations
            )
        if final_summary_info:
            db_summarize_task.summary = final_summary_info.summary
            db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
            db_document.title = final_summary_info.title
            db_document.description = final_summary_info.description
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai summary: {e}")
        db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_summarize_task is not None:
            db_summarize_task.status = DocumentSummarizeStatus.FAILED
            db.commit()
        raise
    finally:
        db.close()


async def _summarize_document(state: DocumentSummarizeState) -> DocumentSummarizeState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document summarize workflow missing document_id or user_id")

    await handle_update_document_ai_summarize(
        document_id=document_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentSummarizeState)
    workflow.add_node("summarize_document", _summarize_document)
    workflow.set_entry_point("summarize_document")
    workflow.add_edge("summarize_document", END)
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
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
        }
    )
