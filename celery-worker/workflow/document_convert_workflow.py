import uuid
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger, format_log_message
from common.document_guard import ensure_document_active
from data.sql.base import async_session_context
from enums.document import DocumentCategory, DocumentMdConvertStatus
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy
from workflow.timing import add_timed_node, ainvoke_with_timing


class DocumentConvertState(TypedDict, total=False):
    document_id: int
    user_id: int
    category: int
    engine_id: int
    md_file_name: str | None
    website_url: str | None
    website_title: str | None
    website_description: str | None
    website_cover: str | None
    website_keywords: str | None
    skip_processing: bool


WORKFLOW_NAME = "document_convert"


async def _get_document_convert_log_context(
    *,
    document_id: int,
    user_id: int,
) -> dict[str, object]:
    context: dict[str, object] = {
        "document_id": document_id,
        "user_id": user_id,
    }
    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if db_document is None:
            return context

        context["category"] = db_document.category

        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=user_id,
        )
        if db_user is not None:
            if db_document.category == DocumentCategory.FILE:
                context["engine_id"] = db_user.default_file_document_parse_user_engine_id
            elif db_document.category == DocumentCategory.WEBSITE:
                context["engine_id"] = db_user.default_website_document_parse_user_engine_id

        if db_document.category == DocumentCategory.FILE:
            db_file_document = await crud.document.get_file_document_by_document_id_async(
                db=db,
                document_id=document_id,
            )
            if db_file_document is not None:
                context["file_name"] = db_file_document.file_name
        elif db_document.category == DocumentCategory.WEBSITE:
            db_website_document = await crud.document.get_website_document_by_document_id_async(
                db=db,
                document_id=document_id,
            )
            if db_website_document is not None:
                context["website_url"] = db_website_document.url

        return context


async def _init_convert_task(
    state: DocumentConvertState
) -> DocumentConvertState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document convert workflow missing document_id or user_id")

    async with async_session_context() as db:
        # 1) 校验 document
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if db_document.category == DocumentCategory.QUICK_NOTE or db_document.category == DocumentCategory.AUDIO:
            # 速记模式在 api 请求时已填充数据，后台不需要 convert；而音频文档在 transcribe 时填充文档，后台不需要 convert
            state["skip_processing"] = True
            return state
        state["category"] = db_document.category

        # 2) 校验 user
        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to process document has not set default user file system")

        if db_document.category == DocumentCategory.FILE:
            if db_user.default_file_document_parse_user_engine_id is None:
                raise Exception("The user which you want to process document has not set default file document parse user engine")
            state["engine_id"] = db_user.default_file_document_parse_user_engine_id
        elif db_document.category == DocumentCategory.WEBSITE:
            if db_user.default_website_document_parse_user_engine_id is None:
                raise Exception("The user which you want to process document has not set default website document parse user engine")
            state["engine_id"] = db_user.default_website_document_parse_user_engine_id

        # 3) 获取/创建任务记录，置为 进行时
        db_convert_task = await crud.task.get_document_convert_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_convert_task is None:
            db_convert_task = await crud.task.create_document_convert_task_async(
                db=db,
                user_id=user_id,
                document_id=document_id,
                status=DocumentMdConvertStatus.CONVERTING
            )
        else:
            if db_convert_task.status != DocumentMdConvertStatus.CONVERTING:
                db_convert_task.status = DocumentMdConvertStatus.CONVERTING
                db_convert_task.update_time = datetime.now(timezone.utc)
        await db.commit()
    return state


async def _convert_document_content(
    state: DocumentConvertState
) -> DocumentConvertState:
    if state.get("skip_processing"):
        return state
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    category = state.get("category")
    engine_id = state.get("engine_id")
    if document_id is None or user_id is None or category is None or engine_id is None:
        raise Exception("Document convert workflow missing context")

    remote_file_service = await FileSystemProxy.create(
        user_id=user_id
    )

    file_name: str | None = None
    website_url: str | None = None

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
        if category == DocumentCategory.FILE:
            db_file_document = await crud.document.get_file_document_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_file_document is None:
                raise Exception("The document you want to process do not have a the file info")
            file_name = db_file_document.file_name
        elif category == DocumentCategory.WEBSITE:
            db_website_document = await crud.document.get_website_document_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_website_document is None:
                raise Exception("The document you want to process do not have a the website info")
            website_url = db_website_document.url
        else:
            raise Exception("Document category not supported")

    engine = await EngineProxy.create_markdown_engine(
        user_id=user_id,
        engine_id=engine_id
    )

    content: str | None = None
    title: str | None = None
    description: str | None = None
    cover: str | None = None

    if category == DocumentCategory.FILE:
        if file_name is None:
            raise Exception("The document file name is missing")
        file_content = await remote_file_service.get_file_content_by_file_path(
            file_path=file_name
        )
        file_bytes = file_content.encode("utf-8") if isinstance(file_content, str) else file_content

        file_suffix = Path(file_name).suffix
        with tempfile.TemporaryDirectory(
            prefix="convert_",
        ) as temp_dir_path:
            # Keep original suffix so markdown engines can infer file type correctly.
            temp_file_path = Path(temp_dir_path) / f"source{file_suffix}"
            temp_file_path.write_bytes(file_bytes)
            file_info = await engine.analyse_file(
                file_path=str(temp_file_path)
            )

        title = file_info.title
        description = file_info.description
        cover = file_info.cover
        content = file_info.content
    else:
        if website_url is None:
            raise Exception("The document website url is missing")
        web_info = await engine.analyse_website(
            url=website_url
        )
        web_info.content = await engine.enrich_website_content_with_video_subtitles(
            url=website_url,
            content=web_info.content
        )
        title = web_info.title
        description = web_info.description
        cover = web_info.cover
        content = web_info.content
        state["website_url"] = website_url
        state["website_title"] = title
        state["website_description"] = description
        state["website_cover"] = cover
        state["website_keywords"] = web_info.keywords

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        db_document.title = title
        db_document.description = description
        db_document.cover = cover
        if category == DocumentCategory.WEBSITE:
            db_website_document = await crud.document.get_website_document_by_document_id_async(
                db=db,
                document_id=document_id,
            )
            if db_website_document is not None:
                db_website_document.keywords = state.get("website_keywords")
        await db.commit()

    if content is None:
        if category == DocumentCategory.FILE:
            raise Exception("The file content which generated by the engine is empty")
        raise Exception("The website content which generated by the engine is empty")

    md_file_name = f"markdown/{uuid.uuid4().hex}.md"

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
    await remote_file_service.upload_raw_content_to_path(
        file_path=md_file_name,
        content=content.encode("utf-8"),
        content_type="text/plain"
    )

    state["md_file_name"] = md_file_name
    return state


async def _mark_convert_success(
    state: DocumentConvertState
) -> DocumentConvertState:
    if state.get("skip_processing"):
        return state
    document_id = state.get("document_id")
    md_file_name = state.get("md_file_name")
    category = state.get("category")
    if document_id is None:
        raise Exception("Document convert workflow missing document_id")

    async with async_session_context() as db:
        await ensure_document_active(db=db, document_id=document_id)
        db_convert_task = await crud.task.get_document_convert_task_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_convert_task is None:
            raise Exception("The convert task of the document is not found")
        db_convert_task.status = DocumentMdConvertStatus.SUCCESS
        db_convert_task.md_file_name = md_file_name
        db_convert_task.update_time = datetime.now(timezone.utc)
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id
        )
        if db_document is not None:
            db_document.content_update_time = datetime.now(timezone.utc)
        if category == DocumentCategory.WEBSITE:
            website_url = state.get("website_url")
            if website_url is not None:
                await crud.document.create_website_document_snapshot_async(
                    db=db,
                    document_id=document_id,
                    url=website_url,
                    title=state.get("website_title"),
                    description=state.get("website_description"),
                    cover=state.get("website_cover"),
                    md_file_name=md_file_name,
                )
        await db.commit()
    return state


def _build_workflow():
    workflow = StateGraph(DocumentConvertState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="init_convert_task",
        node_func=_init_convert_task,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="convert_document",
        node_func=_convert_document_content,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="mark_convert_success",
        node_func=_mark_convert_success,
    )
    workflow.set_entry_point("init_convert_task")
    workflow.add_edge("init_convert_task", "convert_document")
    workflow.add_edge("convert_document", "mark_convert_success")
    workflow.add_edge("mark_convert_success", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_convert_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_convert_workflow(
    *,
    document_id: int,
    user_id: int
) -> None:
    workflow = get_document_convert_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "document_id": document_id,
                "user_id": user_id,
            },
        )
    except Exception as e:
        try:
            log_context = await _get_document_convert_log_context(
                document_id=document_id,
                user_id=user_id,
            )
        except Exception as log_context_error:
            log_context = {
                "document_id": document_id,
                "user_id": user_id,
                "log_context_error": log_context_error,
            }
        exception_logger.error(
            format_log_message(
                "document_convert_workflow_failed",
                **log_context,
                error=e,
            ),
            exc_info=True,
        )
        async with async_session_context() as db:
            db_convert_task = await crud.task.get_document_convert_task_by_document_id_async(
                db=db,
                document_id=document_id
            )
            if db_convert_task is not None:
                db_convert_task.status = DocumentMdConvertStatus.FAILED
                db_convert_task.update_time = datetime.now(timezone.utc)
                await db.commit()
        raise
