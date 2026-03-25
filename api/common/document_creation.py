from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger
from celery import chain, group
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.apscheduler.app import scheduler
from common.celery.app import start_process_document, start_process_section
from common.resource_plan_access import ensure_engine_access, ensure_model_access
from common.section_defaults import (
    TODAY_SECTION_DEFAULT_AUTO_ILLUSTRATION,
    TODAY_SECTION_DEFAULT_AUTO_PODCAST,
    TODAY_SECTION_DEFAULT_PROCESS_CRON,
)
from common.timezone import (
    encode_cron_expr_with_timezone,
    get_cached_user_timezone,
    normalize_timezone_name,
    today_in_timezone,
)
from enums.document import DocumentCategory, UserDocumentAuthority
from enums.section import (
    SectionDocumentIntegration,
    SectionProcessTriggerType,
    UserSectionAuthority,
    UserSectionRole,
)
from schemas.error import CustomException


def _schedule_section_process_for_today_section(
    *,
    db_section: models.section.Section,
    timezone_name: str,
) -> None:
    job_id = f"section-process-{db_section.id!s}"
    job = scheduler.get_job(job_id)
    if job is not None:
        scheduler.remove_job(job_id)
    scheduler.add_job(
        func=start_process_section,
        kwargs={
            "section_id": db_section.id,
            "user_id": db_section.creator_id,
            "auto_podcast": db_section.auto_podcast,
        },
        trigger=CronTrigger.from_crontab(
            TODAY_SECTION_DEFAULT_PROCESS_CRON,
            timezone=ZoneInfo(normalize_timezone_name(timezone_name)),
        ),
        id=job_id,
    )


def _ensure_today_section_defaults(
    *,
    db: Session,
    db_section: models.section.Section,
    user_id: int,
    timezone_name: str,
    default_auto_podcast: bool,
    default_auto_illustration: bool,
) -> bool:
    changed = False
    if db_section.auto_podcast != default_auto_podcast:
        db_section.auto_podcast = default_auto_podcast
        changed = True
    if db_section.auto_illustration != default_auto_illustration:
        db_section.auto_illustration = default_auto_illustration
        changed = True

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user_id,
            section_id=db_section.id,
            trigger_type=SectionProcessTriggerType.SCHEDULER,
        )
        changed = True
    elif db_section_process_task.trigger_type != SectionProcessTriggerType.SCHEDULER:
        db_section_process_task.trigger_type = SectionProcessTriggerType.SCHEDULER
        changed = True

    db_section_process_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    stored_cron_expr = encode_cron_expr_with_timezone(
        cron_expr=TODAY_SECTION_DEFAULT_PROCESS_CRON,
        timezone_name=timezone_name,
    )
    if db_section_process_scheduler is None:
        crud.task.create_section_process_task_trigger_scheduler(
            db=db,
            section_process_task_id=db_section_process_task.id,
            cron_expr=stored_cron_expr,
        )
        changed = True
    elif db_section_process_scheduler.cron_expr != stored_cron_expr:
        db_section_process_scheduler.cron_expr = stored_cron_expr
        changed = True

    return changed


async def ensure_document_creation_requirements(
    *,
    db: Session,
    user: models.user.User,
    document_create_request: schemas.document.BaseDocumentCreateRequest,
) -> None:
    if user.default_user_file_system is None:
        raise CustomException("Default file system is not configured", code=400)

    if user.default_document_reader_model_id is None:
        raise CustomException("Default document reader model is not configured", code=400)
    await ensure_model_access(
        db=db,
        user=user,
        model_id=user.default_document_reader_model_id,
    )

    if document_create_request.category == DocumentCategory.WEBSITE:
        if user.default_website_document_parse_user_engine_id is None:
            raise CustomException(
                "Default website parse engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_website_document_parse_user_engine_id,
        )
    elif document_create_request.category in (
        DocumentCategory.FILE,
        DocumentCategory.AUDIO,
    ):
        if user.default_file_document_parse_user_engine_id is None:
            raise CustomException(
                "Default file parse engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_file_document_parse_user_engine_id,
        )

    if document_create_request.auto_podcast:
        if user.default_podcast_user_engine_id is None:
            raise CustomException(
                "Default podcast engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_podcast_user_engine_id,
        )

    if document_create_request.auto_transcribe:
        if user.default_audio_transcribe_engine_id is None:
            raise CustomException(
                "Default audio transcribe engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_audio_transcribe_engine_id,
        )


async def create_document_for_user(
    *,
    db: Session,
    user: models.user.User,
    document_create_request: schemas.document.DocumentCreateRequest,
    summary_timezone: str | None = None,
) -> models.document.Document:
    await ensure_document_creation_requirements(
        db=db,
        user=user,
        document_create_request=document_create_request,
    )
    now = datetime.now(timezone.utc)
    if summary_timezone is None:
        summary_timezone = await get_cached_user_timezone(user.id)
    summary_date = today_in_timezone(summary_timezone)
    created_today_section = False
    today_section_auto_podcast = False
    today_section_auto_illustration = False

    if user.default_podcast_user_engine_id is not None:
        try:
            await ensure_engine_access(
                db=db,
                user=user,
                engine_id=user.default_podcast_user_engine_id,
            )
            today_section_auto_podcast = TODAY_SECTION_DEFAULT_AUTO_PODCAST
        except CustomException as exc:
            if exc.code not in {403, 404}:
                raise
    if user.default_image_generate_engine_id is not None:
        try:
            await ensure_engine_access(
                db=db,
                user=user,
                engine_id=user.default_image_generate_engine_id,
            )
            today_section_auto_illustration = TODAY_SECTION_DEFAULT_AUTO_ILLUSTRATION
        except CustomException as exc:
            if exc.code not in {403, 404}:
                raise

    if document_create_request.category == DocumentCategory.WEBSITE:
        if document_create_request.url is None:
            raise CustomException("URL is required for website documents", code=400)
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
            raise CustomException("File name is required for file documents", code=400)
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
            raise CustomException("Content is required for quick notes", code=400)
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
            raise CustomException("File name is required for audio documents", code=400)
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
        raise CustomException("Unsupported document category", code=400)

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
        created_today_section = True
        db_today_section = crud.section.create_section(
            db=db,
            creator_id=user.id,
            title=f"{summary_date.isoformat()} Summary",
            description=f"This document is the summary of all documents on {summary_date.isoformat()}.",
            auto_podcast=today_section_auto_podcast,
            auto_illustration=today_section_auto_illustration,
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
        db_today_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_today_section.id,
            trigger_type=SectionProcessTriggerType.SCHEDULER,
        )
        crud.task.create_section_process_task_trigger_scheduler(
            db=db,
            section_process_task_id=db_today_section_process_task.id,
            cron_expr=encode_cron_expr_with_timezone(
                cron_expr=TODAY_SECTION_DEFAULT_PROCESS_CRON,
                timezone_name=summary_timezone,
            ),
        )
    else:
        created_today_section = _ensure_today_section_defaults(
            db=db,
            db_section=db_today_section,
            user_id=user.id,
            timezone_name=summary_timezone,
            default_auto_podcast=today_section_auto_podcast,
            default_auto_illustration=today_section_auto_illustration,
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
    if created_today_section:
        _schedule_section_process_for_today_section(
            db_section=db_today_section,
            timezone_name=summary_timezone,
        )

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
