import uuid
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.logger import exception_logger
from common.document_guard import ensure_document_active
from config.base import BASE_DIR
from data.sql.base import session_scope
from enums.document import DocumentCategory, DocumentMdConvertStatus
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy


class DocumentConvertState(TypedDict, total=False):
    document_id: int
    user_id: int


async def handle_convert_document_md(
    document_id: int,
    user_id: int
):
    db = session_scope()
    try:
        # 1) 校验 document
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if db_document.category == DocumentCategory.QUICK_NOTE or db_document.category == DocumentCategory.AUDIO:
            # 速记模式在 api 请求时已填充数据，后台不需要 convert；而音频文档在 transcribe 时填充文档，后台不需要 convert
            return

        # 2) 校验 user
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to process document has not set default user file system")

        # 3) 获取/创建任务记录，置为 进行时
        db_convert_task = crud.task.get_document_convert_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_convert_task is None:
            db_convert_task = crud.task.create_document_convert_task(
                db=db,
                user_id=user_id,
                document_id=document_id,
                status=DocumentMdConvertStatus.CONVERTING
            )
        else:
            if db_convert_task.status != DocumentMdConvertStatus.CONVERTING:
                db_convert_task.status = DocumentMdConvertStatus.CONVERTING
        db.commit()

        remote_file_service = await FileSystemProxy.create(
            user_id=user_id
        )

        db_engine = None
        if db_document.category == DocumentCategory.FILE:
            if db_user.default_file_document_parse_user_engine_id is None:
                raise Exception("The user which you want to process document has not set default file document parse user engine")
            db_engine = crud.engine.get_engine_by_engine_id(
                db=db,
                engine_id=db_user.default_file_document_parse_user_engine_id
            )
        elif db_document.category == DocumentCategory.WEBSITE:
            if db_user.default_website_document_parse_user_engine_id is None:
                raise Exception("The user which you want to process document has not set default website document parse user engine")
            db_engine = crud.engine.get_engine_by_engine_id(
                db=db,
                engine_id=db_user.default_website_document_parse_user_engine_id
            )
        if db_engine is None:
            raise Exception("There are something wrong with the user's markdown convert engine")

        engine = None
        if db_document.category == DocumentCategory.FILE:
            if db_user.default_file_document_parse_user_engine_id is None:
                raise Exception("The user who want to process document has not set default file document parse user engine")
            engine = await EngineProxy.create(
                user_id=user_id,
                engine_id=db_user.default_file_document_parse_user_engine_id
            )
        elif db_document.category == DocumentCategory.WEBSITE:
            if db_user.default_website_document_parse_user_engine_id is None:
                raise Exception("The user who want to process document has not set default website document parse user engine")
            engine = await EngineProxy.create(
                user_id=user_id,
                engine_id=db_user.default_website_document_parse_user_engine_id
            )

        md_file_name = None
        
        # 4) 任务进行
        if db_document.category == DocumentCategory.FILE:
            ensure_document_active(db=db, document_id=document_id)
            db_file_document = crud.document.get_file_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_file_document is None:
                raise Exception("The document you want to process do not have a the file info")

            file_content = await remote_file_service.get_file_content_by_file_path(
                file_path=db_file_document.file_name
            )
            temp_file_path = f"{str(BASE_DIR)}/temp/{db_file_document.file_name.replace('files/', '')}"
            with open(temp_file_path, "wb") as f:
                f.write(file_content)

            file_info = await engine.analyse_file(
                file_path=temp_file_path
            )
            ensure_document_active(db=db, document_id=document_id)

            db_document.title = file_info.title
            db_document.description = file_info.description
            db_document.cover = file_info.cover
            db.commit()

            if file_info.content is None:
                raise Exception("The file content which generated by the engine is empty")

            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            ensure_document_active(db=db, document_id=document_id)
            await remote_file_service.upload_raw_content_to_path(
                file_path=md_file_name,
                content=file_info.content.encode("utf-8"),
                content_type="text/plain"
            )
        elif db_document.category == DocumentCategory.WEBSITE:
            ensure_document_active(db=db, document_id=document_id)
            db_website_document = crud.document.get_website_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_website_document is None:
                raise Exception("The document you want to process do not have a the website info")

            web_info = await engine.analyse_website(
                url=db_website_document.url
            )
            ensure_document_active(db=db, document_id=document_id)

            db_document.title = web_info.title
            db_document.description = web_info.description
            db_document.cover = web_info.cover
            db.commit()

            if web_info.content is None:
                raise Exception("The website content which generated by the engine is empty")

            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            ensure_document_active(db=db, document_id=document_id)
            await remote_file_service.upload_raw_content_to_path(
                file_path=md_file_name,
                content=web_info.content.encode("utf-8"),
                content_type="text/plain"
            )
        ensure_document_active(db=db, document_id=document_id)
        db_convert_task.status = DocumentMdConvertStatus.SUCCESS
        db_convert_task.md_file_name = md_file_name
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while converting the document to markdown: {e}")
        db_convert_task = crud.task.get_document_convert_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_convert_task is not None:
            db_convert_task.status = DocumentMdConvertStatus.FAILED
            db.commit()
        raise
    finally:
        db.close()


async def _convert_document(
    state: DocumentConvertState
) -> DocumentConvertState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document convert workflow missing document_id or user_id")

    await handle_convert_document_md(
        document_id=document_id,
        user_id=user_id
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentConvertState)
    workflow.add_node("convert_document", _convert_document)
    workflow.set_entry_point("convert_document")
    workflow.add_edge("convert_document", END)
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
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
        }
    )
