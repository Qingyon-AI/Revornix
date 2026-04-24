from datetime import datetime, timezone
from typing import TypedDict

from langgraph.graph import StateGraph, END

import crud
from data.sql.base import async_session_context
from common.logger import exception_logger
from workflow.timing import add_timed_node, ainvoke_with_timing


class SectionProcessStatusState(TypedDict, total=False):
    section_id: int
    status: int


WORKFLOW_NAME = "section_process_status"


async def _update_section_status(
    state: SectionProcessStatusState
) -> SectionProcessStatusState:
    section_id = state.get("section_id")
    status = state.get("status")
    if section_id is None or status is None:
        raise Exception("Section status workflow missing section_id or status")

    async with async_session_context() as db:
        db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
            db=db,
            section_id=section_id
        )
        if db_section_process_task is not None:
            db_section_process_task.status = status
            db_section_process_task.update_time = datetime.now(timezone.utc)
            await db.commit()

    return state


def _build_workflow():
    workflow = StateGraph(SectionProcessStatusState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="update_section_status",
        node_func=_update_section_status,
    )
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
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "section_id": section_id,
                "status": status,
            },
        )
    except Exception as e:
        exception_logger.error(f"Something is error while updating the section status: {e}")
        raise
