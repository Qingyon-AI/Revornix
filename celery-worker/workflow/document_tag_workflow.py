from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from data.sql.base import session_scope
from engine.tag.llm_document import LLMDocumentTagEngine


class DocumentTagState(TypedDict, total=False):
    document_id: int
    user_id: int


async def handle_tag_document(
    document_id: int,
    user_id: int
):
    db = session_scope()
    try:
        tag_engine = LLMDocumentTagEngine(user_id=user_id)
        tags = await tag_engine.generate_tags(
            document_id=document_id
        )
        if tags is None:
            return
        tag_ids = [
            tag.id for tag in tags
        ]
        crud.document.create_document_labels(
            db=db,
            document_id=document_id,
            label_ids=tag_ids
        )
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while tagging the document: {e}")
        raise
    finally:
        db.close()


async def _tag_document(
    state: DocumentTagState
) -> DocumentTagState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document tag workflow missing document_id or user_id")

    await handle_tag_document(
        document_id=document_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentTagState)
    workflow.add_node("tag_document", _tag_document)
    workflow.set_entry_point("tag_document")
    workflow.add_edge("tag_document", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_tag_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_tag_workflow(
    *,
    document_id: int,
    user_id: int
) -> None:
    workflow = get_document_tag_workflow()
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
        }
    )
