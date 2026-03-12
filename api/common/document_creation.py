from datetime import datetime, timezone

from celery import chain, group
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.celery.app import start_process_document, start_process_section
from common.timezone import get_cached_user_timezone, today_in_timezone
from enums.document import DocumentCategory, UserDocumentAuthority
from enums.section import (
    SectionDocumentIntegration,
    SectionProcessTriggerType,
    UserSectionAuthority,
    UserSectionRole,
)


async def create_document_for_user(
    *,
    db: Session,
    user: models.user.User,
    document_create_request: schemas.document.DocumentCreateRequest,
    summary_timezone: str | None = None,
) -> models.document.Document:
    now = datetime.now(timezone.utc)
    if summary_timezone is None:
        summary_timezone = await get_cached_user_timezone(user.id)
    summary_date = today_in_timezone(summary_timezone)

    if document_create_request.category == DocumentCategory.WEBSITE:
        if document_create_request.url is None:
            raise Exception("The url is required when the document category is website")
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            title="Website Analysing...",
            description="Website Analysing...",
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
        )
        crud.document.create_website_document(
            db=db,
            document_id=db_document.id,
            url=document_create_request.url,
        )
    elif document_create_request.category == DocumentCategory.FILE:
        if document_create_request.file_name is None:
            raise Exception("The file name is required when the document category is file")
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title="File document analysing...",
            description="File document analysing...",
        )
        crud.document.create_file_document(
            db=db,
            document_id=db_document.id,
            file_name=document_create_request.file_name,
        )
    elif document_create_request.category == DocumentCategory.QUICK_NOTE:
        if document_create_request.content is None:
            raise Exception("The content is required when the document category is quick note")
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f"Quick Note saved at {now}",
            description=f"Quick Note saved at {now}",
        )
        crud.document.create_quick_note_document(
            db=db,
            document_id=db_document.id,
            content=document_create_request.content,
        )
    elif document_create_request.category == DocumentCategory.AUDIO:
        if document_create_request.file_name is None:
            raise Exception("The audio file is required when the document category is audio")
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f"Audio saved at {now}",
            description=f"Audio saved at {now}",
        )
        crud.document.create_audio_document(
            db=db,
            document_id=db_document.id,
            audio_file_name=document_create_request.file_name,
        )
    else:
        raise Exception("Invalid document category")

    if document_create_request.labels:
        crud.document.create_document_labels(
            db=db,
            document_id=db_document.id,
            label_ids=document_create_request.labels,
        )

    crud.document.create_user_document(
        db=db,
        user_id=user.id,
        document_id=db_document.id,
        authority=UserDocumentAuthority.OWNER,
    )
    crud.task.create_document_process_task(
        db=db,
        user_id=user.id,
        document_id=db_document.id,
    )

    db_today_section = crud.section.get_section_by_user_and_date(
        db=db,
        user_id=user.id,
        date=summary_date,
    )
    if db_today_section is None:
        db_today_section = crud.section.create_section(
            db=db,
            creator_id=user.id,
            title=f"{summary_date.isoformat()} Summary",
            description=f"This document is the summary of all documents on {summary_date.isoformat()}.",
        )
        crud.section.create_section_user(
            db=db,
            section_id=db_today_section.id,
            user_id=user.id,
            role=UserSectionRole.CREATOR,
            authority=UserSectionAuthority.FULL_ACCESS,
        )
        crud.section.create_date_section(
            db=db,
            section_id=db_today_section.id,
            date=summary_date,
        )
        crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_today_section.id,
            trigger_type=SectionProcessTriggerType.UPDATED,
        )

    section_ids = list(
        dict.fromkeys(
            [
                *document_create_request.sections,
                db_today_section.id,
            ]
        )
    )
    for section_id in section_ids:
        crud.section.create_or_update_section_document(
            db=db,
            document_id=db_document.id,
            section_id=section_id,
            status=SectionDocumentIntegration.WAIT_TO,
        )

    db.commit()

    db_sections = crud.section.get_sections_by_document_id(
        db=db,
        document_id=db_document.id,
    )
    db_sections_to_process: list[models.section.Section] = []
    for db_section in db_sections:
        db_section_process_task = crud.task.get_section_process_task_by_section_id(
            db=db,
            section_id=db_section.id,
        )
        if (
            db_section_process_task is not None
            and db_section_process_task.trigger_type == SectionProcessTriggerType.UPDATED
        ):
            db_sections_to_process.append(db_section)

    section_process_tasks = group(
        start_process_section.si(
            section_id=db_section.id,
            user_id=user.id,
            auto_podcast=db_section.auto_podcast,
        )
        for db_section in db_sections_to_process
    )
    background_tasks = chain(
        start_process_document.si(
            document_id=db_document.id,
            user_id=user.id,
            auto_tag=document_create_request.auto_tag,
            auto_summary=document_create_request.auto_summary,
            auto_podcast=document_create_request.auto_podcast,
            auto_transcribe=document_create_request.auto_transcribe,
            override=schemas.task.DocumentOverrideProperty(
                title=document_create_request.title,
                description=document_create_request.description,
                cover=document_create_request.cover,
            ).model_dump(mode="json"),
        ),
        section_process_tasks,
    )
    background_tasks.apply_async()

    return db_document
