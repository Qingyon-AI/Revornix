from typing import TypedDict, cast

import crud
from langgraph.graph import StateGraph, END

from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from common.jwt_utils import create_token
from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.ability import Ability
from enums.document import DocumentGraphStatus
from workflow.graph_workflow import run_knowledge_graph_workflow


class DocumentGraphTaskState(TypedDict, total=False):
    document_id: int
    user_id: int


async def handle_update_document_ai_graph(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
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

    try:
        await run_knowledge_graph_workflow(
            document_id=document_id,
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id,
        )
        db_graph_task.status = DocumentGraphStatus.SUCCESS.value
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while graphing document info: {e}")
        db_graph_task.status = DocumentGraphStatus.FAILED.value
        db.commit()
        raise
    finally:
        db.close()


async def _process_document_graph(state: DocumentGraphTaskState) -> DocumentGraphTaskState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document graph workflow missing document_id or user_id")
    document_id = cast(int, document_id)
    user_id = cast(int, user_id)

    await handle_update_document_ai_graph(
        document_id=document_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentGraphTaskState)
    workflow.add_node("process_document_graph", _process_document_graph)
    workflow.set_entry_point("process_document_graph")
    workflow.add_edge("process_document_graph", END)
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
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
        }
    )
