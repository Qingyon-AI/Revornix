from typing import TypedDict

from langgraph.graph import StateGraph, END

import crud
from data.sql.base import session_scope
from common.logger import exception_logger


class SectionProcessStatusState(TypedDict, total=False):
    section_id: int
    status: int


async def _update_section_status(
    state: SectionProcessStatusState
) -> SectionProcessStatusState:
    section_id = state.get("section_id")
    status = state.get("status")
    if section_id is None or status is None:
        raise Exception("Section status workflow missing section_id or status")

    db = session_scope()
    try:
        db_section_process_task = crud.task.get_section_process_task_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_section_process_task is not None:
            db_section_process_task.status = status
            db.commit()
    finally:
        db.close()

    return state


def _build_workflow():
    workflow = StateGraph(SectionProcessStatusState)
    workflow.add_node("update_section_status", _update_section_status)
    workflow.set_entry_point("update_section_status")
    workflow.add_edge("update_section_status", END)
    return workflow.compile()


_WORKFLOW = None


def get_section_process_status_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_section_process_status_workflow(
    *,
    section_id: int,
    status: int
) -> None:
    workflow = get_section_process_status_workflow()
    try:
        await workflow.ainvoke(
            {
                "section_id": section_id,
                "status": status,
            }
        )
    except Exception as e:
        exception_logger.error(f"Something is error while updating the section status: {e}")
        raise
