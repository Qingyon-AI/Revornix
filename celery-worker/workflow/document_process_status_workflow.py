from typing import TypedDict

from langgraph.graph import StateGraph, END

import crud
from data.sql.base import session_scope
from common.logger import exception_logger
from common.document_guard import DocumentDeletedError, ensure_document_active


class DocumentProcessStatusState(TypedDict, total=False):
    document_id: int
    status: int


async def _update_document_status(
    state: DocumentProcessStatusState
) -> DocumentProcessStatusState:
    document_id = state.get("document_id")
    status = state.get("status")
    if document_id is None or status is None:
        raise Exception("Document status workflow missing document_id or status")

    db = session_scope()
    try:
        try:
            ensure_document_active(db=db, document_id=document_id)
        except DocumentDeletedError:
            return state
        db_document_process_task = crud.task.get_document_process_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document_process_task is not None:
            db_document_process_task.status = status
            db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the document status: {e}")
        raise e
    finally:
        db.close()

    return state


def _build_workflow():
    workflow = StateGraph(DocumentProcessStatusState)
    workflow.add_node("update_document_status", _update_document_status)
    workflow.set_entry_point("update_document_status")
    workflow.add_edge("update_document_status", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_process_status_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_process_status_workflow(
    *,
    document_id: int,
    status: int
) -> None:
    workflow = get_document_process_status_workflow()
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "status": status,
        }
    )
