import crud

from common.logger import exception_logger
from data.sql.base import session_scope
from enums.document import DocumentCategory, DocumentMdConvertStatus, DocumentAudioTranscribeStatus
from proxy.file_system_proxy import FileSystemProxy
from protocol.remote_file_service import RemoteFileServiceProtocol


def _coerce_markdown_text(content: str | bytes, *, source: str) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, bytes):
        return content.decode("utf-8")
    raise Exception(f"Unexpected markdown content type from {source}: {type(content).__name__}")


async def get_markdown_content_by_section_id(
    *,
    section_id: int,
    user_id: int,
    remote_file_service: RemoteFileServiceProtocol | None = None,
):
    section_md_file_name: str | None = None
    try:
        db = session_scope()
        try:
            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=user_id
            )
            if db_user is None:
                raise Exception("The user who want to get the markdown content is not found")
            if db_user.default_user_file_system is None:
                raise Exception("The user who want to get the markdown content does not have a default user file system")

            db_section = crud.section.get_section_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section is None:
                raise Exception("The section which you want to get the markdown content is not found")
            if db_section.md_file_name is None:
                raise Exception("The section which you want to get the markdown content does not have a markdown file")
            section_md_file_name = db_section.md_file_name
        finally:
            db.close()

        file_service = remote_file_service
        if file_service is None:
            file_service = await FileSystemProxy.create(
                user_id=user_id
            )
        if section_md_file_name is None:
            raise Exception("The section markdown file is missing")
        raw_content = await file_service.get_file_content_by_file_path(
            file_path=section_md_file_name
        )
        markdown_content = _coerce_markdown_text(
            raw_content,
            source=section_md_file_name,
        )
        return markdown_content
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}, parameter: {section_id}, {user_id}")
        raise


async def get_markdown_content_by_document_id(
    *,
    document_id: int,
    user_id: int,
    remote_file_service: RemoteFileServiceProtocol | None = None,
):
    markdown_content: str | None = None
    markdown_file_name: str | None = None
    try:
        db = session_scope()
        try:
            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=user_id
            )
            if db_user is None:
                raise Exception("The user does not exist")
            if db_user.default_user_file_system is None:
                raise Exception("The user havn't set the default file system")

            db_document = crud.document.get_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_document is None:
                raise Exception("Document not found")
            if db_document.category == DocumentCategory.WEBSITE or db_document.category == DocumentCategory.FILE:
                db_convert_task = crud.task.get_document_convert_task_by_document_id(
                    db=db,
                    document_id=document_id
                )
                if db_convert_task is None or db_convert_task.status != DocumentMdConvertStatus.SUCCESS or db_convert_task.md_file_name is None:
                    raise Exception("The document convert task of the document you want to summary havn't been finished")
                markdown_file_name = db_convert_task.md_file_name
            elif db_document.category == DocumentCategory.QUICK_NOTE:
                quick_note_document = crud.document.get_quick_note_document_by_document_id(
                    db=db,
                    document_id=document_id
                )
                if quick_note_document is None:
                    raise Exception("The quick note info of the document is not found")
                markdown_content = quick_note_document.content
            elif db_document.category == DocumentCategory.AUDIO:
                db_transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
                    db=db,
                    document_id=document_id
                )
                if db_transcribe_task is None or db_transcribe_task.status != DocumentAudioTranscribeStatus.SUCCESS or db_transcribe_task.transcribed_text is None:
                    raise Exception("The document transcribe task of the document you want to summary havn't been finished")
                markdown_content = db_transcribe_task.transcribed_text
            else:
                raise Exception("Document category not supported")
        finally:
            db.close()

        if markdown_content is not None:
            return markdown_content
        if markdown_file_name is None:
            raise Exception("The markdown file name is not found")

        file_service = remote_file_service
        if file_service is None:
            file_service = await FileSystemProxy.create(
                user_id=user_id
            )
        raw_content = await file_service.get_file_content_by_file_path(
            file_path=markdown_file_name
        )
        markdown_content = _coerce_markdown_text(
            raw_content,
            source=markdown_file_name,
        )
        return markdown_content
    except Exception as e:
        exception_logger.error(f"Something is error while getting the markdown content: {e}")
        raise
