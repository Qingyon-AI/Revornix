from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.document import DocumentProcessStatus
from schemas.task import DocumentOverrideProperty
from workflow.document_chunk_process_workflow import run_document_chunk_process_workflow
from workflow.document_convert_workflow import run_document_convert_workflow
from workflow.document_podcast_workflow import run_document_podcast_workflow
from workflow.document_tag_workflow import run_document_tag_workflow
from workflow.document_transcribe_workflow import run_document_transcribe_workflow


class DocumentProcessState(TypedDict, total=False):
    document_id: int
    user_id: int
    auto_summary: bool
    auto_podcast: bool
    auto_transcribe: bool
    auto_tag: bool
    override: dict | DocumentOverrideProperty | None


async def handle_process_document(
    document_id: int,
    user_id: int,
    auto_tag: bool = False,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_transcribe: bool = False,
    override: DocumentOverrideProperty | None = None
):
    db = SessionLocal()

    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")

        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to process document has not set default user file system")
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to process document has not set default document reader model")

        db_document_process_task = crud.task.get_document_process_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document_process_task is None:
            db_document_process_task = crud.task.create_document_process_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
                status=DocumentProcessStatus.PROCESSING
            )
        else:
            if db_document_process_task.status != DocumentProcessStatus.PROCESSING:
                db_document_process_task.status = DocumentProcessStatus.PROCESSING
        db.commit()

        # 音频转文本
        if auto_transcribe:
            await run_document_transcribe_workflow(
                document_id=document_id,
                user_id=user_id
            )

        # pdf/docx/png等内容 转markdown
        await run_document_convert_workflow(
            document_id=document_id,
            user_id=user_id
        )

        # 覆盖文档元信息
        if override is not None:
            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document is None:
                raise Exception("The document you want to process is not found")
            if override.cover is not None:
                db_document.cover = override.cover
            if override.title is not None:
                db_document.title = override.title
            if override.description is not None:
                db_document.description = override.description
            db.commit()

        # 打标
        if auto_tag:
            await run_document_tag_workflow(
                document_id=document_id,
                user_id=user_id
            )

        # chunk & embedding & graph & summarize
        await run_document_chunk_process_workflow(
            document_id=document_id,
            user_id=user_id,
            auto_summary=auto_summary,
        )

        # 播客生成任务
        if auto_podcast:
            await run_document_podcast_workflow(
                document_id=db_document.id,
                user_id=user_id
            )

        db_document_process_task.status = DocumentProcessStatus.SUCCESS.value
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while process document info: {e}")
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is not None:
            db_document.title = f"Error: {e}"
            db_document.description = f"Error: {e}"
        db_document_process_task = crud.task.get_document_process_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document_process_task is not None:
            db_document_process_task.status = DocumentProcessStatus.FAILED
        db.commit()
        raise
    finally:
        db.close()


async def _process_document(state: DocumentProcessState) -> DocumentProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")

    auto_summary = bool(state.get("auto_summary", False))
    auto_podcast = bool(state.get("auto_podcast", False))
    auto_transcribe = bool(state.get("auto_transcribe", False))
    auto_tag = bool(state.get("auto_tag", False))

    override_obj = None
    raw_override = state.get("override")
    if raw_override is not None:
        if isinstance(raw_override, DocumentOverrideProperty):
            override_obj = raw_override
        else:
            override_obj = DocumentOverrideProperty.model_validate(raw_override)

    await handle_process_document(
        document_id=document_id,
        user_id=user_id,
        auto_summary=auto_summary,
        auto_podcast=auto_podcast,
        auto_transcribe=auto_transcribe,
        auto_tag=auto_tag,
        override=override_obj
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentProcessState)
    workflow.add_node("process_document", _process_document)
    workflow.set_entry_point("process_document")
    workflow.add_edge("process_document", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_process_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_process_workflow(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_transcribe: bool = False,
    auto_tag: bool = False,
    override: dict | None = None
) -> None:
    workflow = get_document_process_workflow()
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
            "auto_summary": auto_summary,
            "auto_podcast": auto_podcast,
            "auto_transcribe": auto_transcribe,
            "auto_tag": auto_tag,
            "override": override,
        }
    )
