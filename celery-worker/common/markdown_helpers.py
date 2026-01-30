import crud

from common.logger import exception_logger
from data.sql.base import session_scope
from enums.document import DocumentCategory, DocumentMdConvertStatus, DocumentAudioTranscribeStatus
from proxy.file_system_proxy import FileSystemProxy

async def get_markdown_content_by_section_id(
    *,
    section_id: int,
    user_id: int
):
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

        remote_file_service = await FileSystemProxy.create(
            user_id=user_id
        )

        db_section = crud.section.get_section_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_section is None:
            raise Exception("The section which you want to get the markdown content is not found")
        if db_section.md_file_name is None:
            raise Exception("The section which you want to get the markdown content does not have a markdown file")
        markdown_content = await remote_file_service.get_file_content_by_file_path(
            file_path=db_section.md_file_name
        )
        return markdown_content
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}, parameter: {section_id}, {user_id}")
        raise
    finally:
        db.close()


async def get_markdown_content_by_document_id(
    *,
    document_id: int,
    user_id: int
):
    db = session_scope()
    db_user = crud.user.get_user_by_id(
        db=db,
        user_id=user_id
    )
    if db_user is None:
        raise Exception("The user does not exist")
    if db_user.default_user_file_system is None:
        raise Exception("The user havn't set the default file system")

    remote_file_service = await FileSystemProxy.create(
        user_id=user_id
    )

    try:
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
            markdown_content = await remote_file_service.get_file_content_by_file_path(
                file_path=db_convert_task.md_file_name
            )
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
    except Exception as e:
        exception_logger.error(f"Something is error while getting the markdown content: {e}")
        raise
    finally:
        db.close()
    return markdown_content
