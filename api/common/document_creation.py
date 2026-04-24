from datetime import date as date_type
from datetime import datetime, timezone

from celery import chain, group
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.apscheduler.app import scheduler
from common.celery.app import start_process_document, start_process_section
from common.resource_plan_access import ensure_engine_access, ensure_model_access
from common.section_schedule import build_day_section_trigger
from common.section_defaults import (
    TODAY_SECTION_DEFAULT_AUTO_ILLUSTRATION,
    TODAY_SECTION_DEFAULT_AUTO_PODCAST,
    TODAY_SECTION_DEFAULT_PROCESS_CRON,
)
from common.timezone import (
    encode_cron_expr_with_timezone,
    get_cached_user_timezone,
    today_in_timezone,
)
from enums.document import DocumentCategory, UserDocumentAuthority
from enums.document import DocumentProcessStatus
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
    section_date: date_type,
    timezone_name: str,
) -> None:
    job_id = f"section-process-{db_section.id!s}"
    job = scheduler.get_job(job_id)
    if job is not None:
        scheduler.remove_job(job_id)

    trigger = build_day_section_trigger(
        section_date=section_date,
        cron_expr=TODAY_SECTION_DEFAULT_PROCESS_CRON,
        timezone_name=timezone_name,
    )
    if trigger is None:
        return

    scheduler.add_job(
        func=start_process_section,
        kwargs={
            "section_id": db_section.id,
            "user_id": db_section.creator_id,
            "auto_podcast": db_section.auto_podcast,
        },
        trigger=trigger,
        id=job_id,
    )


async def _ensure_today_section_defaults(
    *,
    db: AsyncSession,
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

    db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
        db=db,
        section_id=db_section.id,
    )
    if db_section_process_task is None:
        db_section_process_task = await crud.task.create_section_process_task_async(
            db=db,
            user_id=user_id,
            section_id=db_section.id,
            trigger_type=SectionProcessTriggerType.SCHEDULER,
        )
        changed = True
    elif db_section_process_task.trigger_type != SectionProcessTriggerType.SCHEDULER:
        db_section_process_task.trigger_type = SectionProcessTriggerType.SCHEDULER
        changed = True

    db_section_process_scheduler = await crud.task.get_section_process_trigger_scheduler_by_section_id_async(
        db=db,
        section_id=db_section.id,
    )
    stored_cron_expr = encode_cron_expr_with_timezone(
        cron_expr=TODAY_SECTION_DEFAULT_PROCESS_CRON,
        timezone_name=timezone_name,
    )
    if db_section_process_scheduler is None:
        await crud.task.create_section_process_task_trigger_scheduler_async(
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
    db: AsyncSession,
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


async def _sync_document_labels(
    *,
    db: AsyncSession,
    document_id: int,
    label_ids: list[int],
) -> None:
    if not label_ids:
        return
    existing_document_labels = await crud.document.get_document_labels_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    existing_label_ids = {item.label_id for item in existing_document_labels}
    new_label_ids = [label_id for label_id in label_ids if label_id not in existing_label_ids]
    if new_label_ids:
        await crud.document.create_document_labels_async(
            db=db,
            document_id=document_id,
            label_ids=new_label_ids,
        )


async def _ensure_document_process_task(
    *,
    db: AsyncSession,
    user_id: int,
    document_id: int,
) -> None:
    now = datetime.now(timezone.utc)
    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if db_process_task is None:
        await crud.task.create_document_process_task_async(
            db=db,
            user_id=user_id,
            document_id=document_id,
        )
        return
    db_process_task.status = DocumentProcessStatus.WAIT_TO
    db_process_task.update_time = now


async def _queue_document_background_processing(
    *,
    db: AsyncSession,
    db_document: models.document.Document,
    user: models.user.User,
    document_create_request: schemas.document.DocumentCreateRequest,
) -> None:
    db_sections = await crud.section.get_sections_by_document_id_async(
        db=db,
        document_id=db_document.id,
    )
    db_sections_to_process: list[models.section.Section] = []
    for db_section in db_sections:
        db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
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


async def create_document_for_user(
    *,
    db: AsyncSession,
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
        normalized_url = document_create_request.url.strip()
        existing_website_document = await crud.document.get_website_document_by_user_id_and_url_async(
            db=db,
            user_id=user.id,
            url=normalized_url,
        )
        if existing_website_document is not None:
            db_document = existing_website_document
        else:
            db_document = await crud.document.create_base_document_async(
                db=db,
                creator_id=user.id,
                title="Website Analysing...",
                description="Website Analysing...",
                category=document_create_request.category,
                from_plat=document_create_request.from_plat,
            )
            await crud.document.create_website_document_async(
                db=db,
                document_id=db_document.id,
                url=normalized_url,
            )
    elif document_create_request.category == DocumentCategory.FILE:
        if document_create_request.file_name is None:
            raise CustomException("File name is required for file documents", code=400)
        db_document = await crud.document.create_base_document_async(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title="File document analysing...",
            description="File document analysing...",
        )
        await crud.document.create_file_document_async(
            db=db,
            document_id=db_document.id,
            file_name=document_create_request.file_name,
        )
    elif document_create_request.category == DocumentCategory.QUICK_NOTE:
        if document_create_request.content is None:
            raise CustomException("Content is required for quick notes", code=400)
        db_document = await crud.document.create_base_document_async(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f"Quick Note saved at {now}",
            description=f"Quick Note saved at {now}",
        )
        await crud.document.create_quick_note_document_async(
            db=db,
            document_id=db_document.id,
            content=document_create_request.content,
        )
    elif document_create_request.category == DocumentCategory.AUDIO:
        if document_create_request.file_name is None:
            raise CustomException("File name is required for audio documents", code=400)
        db_document = await crud.document.create_base_document_async(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f"Audio saved at {now}",
            description=f"Audio saved at {now}",
        )
        await crud.document.create_audio_document_async(
            db=db,
            document_id=db_document.id,
            audio_file_name=document_create_request.file_name,
        )
    else:
        raise CustomException("Unsupported document category", code=400)

    await _sync_document_labels(
        db=db,
        document_id=db_document.id,
        label_ids=document_create_request.labels,
    )

    if await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=user.id,
        document_id=db_document.id,
    ) is None:
        await crud.document.create_user_document_async(
            db=db,
            user_id=user.id,
            document_id=db_document.id,
            authority=UserDocumentAuthority.OWNER,
        )
    await _ensure_document_process_task(
        db=db,
        user_id=user.id,
        document_id=db_document.id,
    )

    db_today_section = await crud.section.get_section_by_user_and_date_async(
        db=db,
        user_id=user.id,
        date=summary_date,
    )
    if db_today_section is None:
        db_today_section = await crud.section.create_section_async(
            db=db,
            creator_id=user.id,
            title=f"{summary_date.isoformat()} Summary",
            description=f"This document is the summary of all documents on {summary_date.isoformat()}.",
            auto_podcast=today_section_auto_podcast,
            auto_illustration=today_section_auto_illustration,
        )
        await crud.section.create_section_user_async(
            db=db,
            section_id=db_today_section.id,
            user_id=user.id,
            role=UserSectionRole.CREATOR,
            authority=UserSectionAuthority.FULL_ACCESS,
        )
        await crud.section.create_date_section_async(
            db=db,
            section_id=db_today_section.id,
            date=summary_date,
        )
        db_today_section_process_task = await crud.task.create_section_process_task_async(
            db=db,
            user_id=user.id,
            section_id=db_today_section.id,
            trigger_type=SectionProcessTriggerType.SCHEDULER,
        )
        await crud.task.create_section_process_task_trigger_scheduler_async(
            db=db,
            section_process_task_id=db_today_section_process_task.id,
            cron_expr=encode_cron_expr_with_timezone(
                cron_expr=TODAY_SECTION_DEFAULT_PROCESS_CRON,
                timezone_name=summary_timezone,
            ),
        )
    else:
        await _ensure_today_section_defaults(
            db=db,
            db_section=db_today_section,
            user_id=user.id,
            timezone_name=summary_timezone,
            default_auto_podcast=today_section_auto_podcast,
            default_auto_illustration=today_section_auto_illustration,
        )

    existing_section_ids = [
        section.id
        for section in await crud.section.get_sections_by_document_id_async(
            db=db,
            document_id=db_document.id,
        )
    ]
    section_ids = list(
        dict.fromkeys(
            [
                *existing_section_ids,
                *document_create_request.sections,
                db_today_section.id,
            ]
        )
    )
    for section_id in section_ids:
        await crud.section.create_or_update_section_document_async(
            db=db,
            document_id=db_document.id,
            section_id=section_id,
            status=SectionDocumentIntegration.WAIT_TO,
        )

    await db.commit()
    _schedule_section_process_for_today_section(
        db_section=db_today_section,
        section_date=summary_date,
        timezone_name=summary_timezone,
    )

    await _queue_document_background_processing(
        db=db,
        db_document=db_document,
        user=user,
        document_create_request=document_create_request,
    )

    return db_document
