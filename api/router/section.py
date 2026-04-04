import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.apscheduler.app import scheduler
from common.celery.app import (
    start_process_section,
    start_process_section_podcast,
    start_process_section_ppt,
    start_trigger_user_notification_event,
)
from common.dependencies import get_current_user, get_db, get_request_timezone
from common.resource_plan_access import ensure_engine_access, ensure_model_access
from common.section_schedule import build_day_section_trigger
from common.timezone import (
    decode_cron_expr_with_timezone,
    encode_cron_expr_with_timezone,
    normalize_timezone_name,
)
from enums.notification import NotificationTriggerEventUUID
from enums.section import (
    SectionDocumentIntegration,
    SectionPodcastStatus,
    SectionProcessStatus,
    SectionProcessTriggerType,
    UserSectionAuthority,
    UserSectionRole,
)
from router.section_comment_manage import section_comment_manage_router
from router.section_ai import section_ai_router
from router.section_detail_query import section_detail_query_router
from router.section_label_manage import section_label_manage_router
from router.section_publish_manage import section_publish_manage_router
from router.section_search_query import section_search_query_router
from router.section_subscription_manage import section_subscription_manage_router
from router.section_user_manage import section_user_manage_router
from router.section_user_query import section_user_query_router

section_router = APIRouter()
section_router.include_router(section_comment_manage_router)
section_router.include_router(section_ai_router)
section_router.include_router(section_user_manage_router)
section_router.include_router(section_label_manage_router)
section_router.include_router(section_publish_manage_router)
section_router.include_router(section_user_query_router)
section_router.include_router(section_search_query_router)
section_router.include_router(section_detail_query_router)
section_router.include_router(section_subscription_manage_router)


def _get_section_ppt_manifest_path(section_id: int) -> str:
    return f"generated/sections/{section_id}/ppt/manifest.json"


async def _get_section_ppt_manifest_status(
    *,
    user_id: int,
    section_id: int,
) -> str | None:
    try:
        from proxy.file_system_proxy import FileSystemProxy

        remote_file_service = await FileSystemProxy.create(user_id=user_id)
        raw_content = await remote_file_service.get_file_content_by_file_path(
            _get_section_ppt_manifest_path(section_id)
        )
        if isinstance(raw_content, bytes):
            manifest = json.loads(raw_content.decode("utf-8"))
        else:
            manifest = json.loads(raw_content)
        if isinstance(manifest, dict):
            status = manifest.get("status")
            if isinstance(status, str):
                return status
    except Exception:
        return None
    return None


async def _write_section_ppt_manifest(
    *,
    user_id: int,
    section_id: int,
    payload: dict,
) -> None:
    from proxy.file_system_proxy import FileSystemProxy

    remote_file_service = await FileSystemProxy.create(user_id=user_id)
    await remote_file_service.upload_raw_content_to_path(
        file_path=_get_section_ppt_manifest_path(section_id),
        content=json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
        content_type="application/json",
    )


def _section_process_job_id(section_id: int) -> str:
    return f"section-process-{section_id!s}"


def _remove_section_process_schedule(section_id: int) -> None:
    job_id = _section_process_job_id(section_id)
    job = scheduler.get_job(job_id)
    if job is not None:
        scheduler.remove_job(job_id)


def _schedule_section_process(
    *,
    db: Session,
    db_section: models.section.Section,
    cron_expr: str,
    timezone_name: str,
) -> None:
    db_day_section = crud.section.get_day_section_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    if db_day_section is not None:
        trigger = build_day_section_trigger(
            section_date=db_day_section.date,
            cron_expr=cron_expr,
            timezone_name=timezone_name,
        )
        if trigger is None:
            return
    else:
        trigger = CronTrigger.from_crontab(
            cron_expr,
            timezone=ZoneInfo(normalize_timezone_name(timezone_name)),
        )

    scheduler.add_job(
        func=start_process_section,
        kwargs={
            "section_id": db_section.id,
            "user_id": db_section.creator_id,
            "auto_podcast": db_section.auto_podcast
        },
        trigger=trigger,
        id=_section_process_job_id(db_section.id),
    )


@section_router.post('/podcast/generate', response_model=schemas.common.NormalResponse)
async def generate_podcast(
    generate_podcast_request: schemas.section.GenerateSectionPodcastRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException('Section not found', code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException('Only the section creator can generate a podcast', code=403)
    if db_section.md_file_name is None:
        raise schemas.error.CustomException('Section markdown is not ready', code=409)

    if user.default_user_file_system is None:
        raise schemas.error.CustomException('Default file system is not configured', code=400)
    if user.default_podcast_user_engine_id is None:
        raise schemas.error.CustomException(
            'Default podcast engine is not configured',
            code=400,
        )
    await ensure_engine_access(
        db=db,
        user=user,
        engine_id=user.default_podcast_user_engine_id,
    )
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_section_process_task is not None and db_section_process_task.status in [
        SectionProcessStatus.WAIT_TO,
        SectionProcessStatus.PROCESSING,
    ]:
        raise schemas.error.CustomException('Section is still processing', code=409)

    db_exist_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == SectionPodcastStatus.WAIT_TO:
            raise schemas.error.CustomException('Podcast task is already queued', code=409)
        if db_exist_podcast_task.status == SectionPodcastStatus.GENERATING:
            raise schemas.error.CustomException('Podcast task is already in progress', code=409)

    now = datetime.now(timezone.utc)
    if db_exist_podcast_task is None:
        db_exist_podcast_task = crud.task.create_section_podcast_task(
            db=db,
            user_id=user.id,
            section_id=generate_podcast_request.section_id,
            status=SectionPodcastStatus.WAIT_TO,
        )
    else:
        db_exist_podcast_task.status = SectionPodcastStatus.WAIT_TO
        db_exist_podcast_task.podcast_file_name = None
        db_exist_podcast_task.update_time = now
    db.commit()

    start_process_section_podcast.delay(db_section.id, user.id)
    return schemas.common.SuccessResponse()


@section_router.post('/ppt/generate', response_model=schemas.common.NormalResponse)
async def generate_ppt(
    generate_ppt_request: schemas.section.GenerateSectionPptRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=generate_ppt_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException('Section not found', code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException('Only the section creator can generate PPT', code=403)
    if db_section.md_file_name is None:
        raise schemas.error.CustomException('Section markdown is not ready', code=409)
    if user.default_user_file_system is None:
        raise schemas.error.CustomException('Default file system is not configured', code=400)
    if user.default_document_reader_model_id is None:
        raise schemas.error.CustomException('Default document reader model is not configured', code=400)
    if user.default_image_generate_engine_id is None:
        raise schemas.error.CustomException('Default image generate engine is not configured', code=400)

    await ensure_model_access(
        db=db,
        user=user,
        model_id=user.default_document_reader_model_id,
    )
    await ensure_engine_access(
        db=db,
        user=user,
        engine_id=user.default_image_generate_engine_id,
    )

    existing_status = await _get_section_ppt_manifest_status(
        user_id=user.id,
        section_id=db_section.id,
    )
    if existing_status in {"wait_to", "processing"}:
        raise schemas.error.CustomException('PPT task is already queued', code=409)

    now = datetime.now(timezone.utc).isoformat()
    await _write_section_ppt_manifest(
        user_id=user.id,
        section_id=db_section.id,
        payload={
            "version": 1,
            "status": "wait_to",
            "title": None,
            "subtitle": None,
            "theme_prompt": None,
            "pptx_file_name": None,
            "error_message": None,
            "create_time": now,
            "update_time": now,
            "slides": [],
        },
    )

    start_process_section_ppt.delay(db_section.id, user.id)
    return schemas.common.SuccessResponse()


@section_router.post('/process/trigger', response_model=schemas.common.NormalResponse)
async def trigger_section_process(
    trigger_process_request: schemas.section.TriggerSectionProcessRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=trigger_process_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException('Section not found', code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException('Only the section creator can trigger processing', code=403)
    if user.default_user_file_system is None:
        raise schemas.error.CustomException('Default file system is not configured', code=400)
    if user.default_document_reader_model_id is None:
        raise schemas.error.CustomException('Default document reader model is not configured', code=400)

    await ensure_model_access(
        db=db,
        user=user,
        model_id=user.default_document_reader_model_id,
    )

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=trigger_process_request.section_id
    )
    if db_section_process_task is not None and db_section_process_task.status in [
        SectionProcessStatus.WAIT_TO,
        SectionProcessStatus.PROCESSING,
    ]:
        raise schemas.error.CustomException('Section process task is already queued', code=409)

    now = datetime.now(timezone.utc)
    if db_section_process_task is None:
        crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=trigger_process_request.section_id,
            status=SectionProcessStatus.WAIT_TO,
        )
    else:
        db_section_process_task.status = SectionProcessStatus.WAIT_TO
        db_section_process_task.update_time = now
    db.commit()

    start_process_section.apply_async(kwargs={
        'section_id': db_section.id,
        'user_id': user.id,
        'auto_podcast': db_section.auto_podcast,
        'force_full_rebuild': True,
    })
    return schemas.common.SuccessResponse()


@section_router.post('/document/retry', response_model=schemas.common.NormalResponse)
def retry_section_document_integration(
    retry_request: schemas.section.RetrySectionDocumentRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=retry_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException('Section not found', code=404)

    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=retry_request.section_id,
        user_id=user.id
    )
    if db_section_user is None or db_section_user.authority not in [
        UserSectionAuthority.READ_AND_WRITE,
        UserSectionAuthority.FULL_ACCESS,
    ]:
        raise schemas.error.CustomException("You don't have permission to retry this section document", code=403)

    db_section_document = crud.section.get_section_document_by_section_id_and_document_id(
        db=db,
        section_id=retry_request.section_id,
        document_id=retry_request.document_id
    )
    if db_section_document is None:
        raise schemas.error.CustomException('Section document not found', code=404)
    if db_section_document.status == SectionDocumentIntegration.SUCCESS:
        raise schemas.error.CustomException('Section document is already integrated', code=409)
    if db_section_document.status == SectionDocumentIntegration.SUPPLEMENTING:
        raise schemas.error.CustomException('Section document is already being integrated', code=409)

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=retry_request.section_id
    )
    if db_section_process_task is not None and db_section_process_task.status in [
        SectionProcessStatus.WAIT_TO,
        SectionProcessStatus.PROCESSING,
    ]:
        raise schemas.error.CustomException('Section is already processing', code=409)

    crud.section.update_section_document_by_section_id_and_document_id(
        db=db,
        section_id=retry_request.section_id,
        document_id=retry_request.document_id,
        status=SectionDocumentIntegration.WAIT_TO
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=retry_request.section_id,
            status=SectionProcessStatus.WAIT_TO
        )
    else:
        db_section_process_task.status = SectionProcessStatus.WAIT_TO
        db_section_process_task.update_time = now
    db.commit()

    start_process_section.apply_async(kwargs={
        'section_id': retry_request.section_id,
        'user_id': user.id,
        'auto_podcast': db_section.auto_podcast,
    })
    return schemas.common.SuccessResponse()

@section_router.post('/create', response_model=schemas.section.SectionCreateResponse)
async def create_section(
    section_create_request: schemas.section.SectionCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
    request_timezone: str = Depends(get_request_timezone),
):
    if section_create_request.auto_podcast:
        if user.default_podcast_user_engine_id is None:
            raise schemas.error.CustomException(
                'Default podcast engine is not configured',
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_podcast_user_engine_id,
        )
    if section_create_request.auto_illustration:
        if user.default_image_generate_engine_id is None:
            raise schemas.error.CustomException(
                'Default image generate engine is not configured',
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_image_generate_engine_id,
        )
    db_section = crud.section.create_section(
        db=db,
        creator_id=user.id,
        cover=section_create_request.cover,
        title=section_create_request.title,
        description=section_create_request.description,
        auto_podcast=section_create_request.auto_podcast,
        auto_illustration=section_create_request.auto_illustration
    )
    if section_create_request.labels:
        crud.section.create_section_labels(
            db=db,
            section_id=db_section.id,
            label_ids=section_create_request.labels
        )
    crud.section.create_section_user(
        db=db,
        section_id=db_section.id,
        user_id=user.id,
        role=UserSectionRole.CREATOR,
        authority=UserSectionAuthority.FULL_ACCESS
    )
    if section_create_request.auto_publish:
        crud.section.create_publish_section(
            db=db,
            section_id=db_section.id
        )
    if (
        section_create_request.process_task_trigger_type == SectionProcessTriggerType.SCHEDULER
        and section_create_request.process_task_trigger_scheduler is None
    ):
        raise schemas.error.CustomException("Scheduler cron expression is required", code=400)

    db_section_process_task = None
    if section_create_request.process_task_trigger_type == SectionProcessTriggerType.SCHEDULER:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_section.id,
            trigger_type=SectionProcessTriggerType.SCHEDULER,
        )

    if (
        section_create_request.process_task_trigger_scheduler is not None
        and db_section_process_task is not None
    ):
        stored_cron_expr = encode_cron_expr_with_timezone(
            cron_expr=section_create_request.process_task_trigger_scheduler,
            timezone_name=request_timezone,
        )
        crud.task.create_section_process_task_trigger_scheduler(
            db=db,
            section_process_task_id=db_section_process_task.id,
            cron_expr=stored_cron_expr
        )
        db.commit()
        if db_section_process_task.trigger_type == SectionProcessTriggerType.SCHEDULER:
            _remove_section_process_schedule(db_section.id)
            _schedule_section_process(
                db=db,
                db_section=db_section,
                cron_expr=section_create_request.process_task_trigger_scheduler,
                timezone_name=request_timezone,
            )
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

@section_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_section(
    section_update_request: schemas.section.SectionUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
    request_timezone: str = Depends(get_request_timezone),
):
    now = datetime.now(timezone.utc)

    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_update_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=user.id,
        section_id=section_update_request.section_id
    )
    if section_user is None or section_user.authority not in [UserSectionAuthority.READ_AND_WRITE, UserSectionAuthority.FULL_ACCESS]:
        raise schemas.error.CustomException("You don't have permission to modify this section", code=403)

    if section_update_request.auto_podcast is True:
        if user.default_podcast_user_engine_id is None:
            raise schemas.error.CustomException(
                'Default podcast engine is not configured',
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_podcast_user_engine_id,
        )
    if section_update_request.auto_illustration is True:
        if user.default_image_generate_engine_id is None:
            raise schemas.error.CustomException(
                'Default image generate engine is not configured',
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_image_generate_engine_id,
        )

    if section_update_request.title is not None:
        db_section.title = section_update_request.title
    if section_update_request.description is not None:
        db_section.description = section_update_request.description
    if section_update_request.cover is not None:
        db_section.cover = section_update_request.cover
    if section_update_request.labels is not None:
        exist_section_labels = crud.section.get_section_labels_by_section_id(
            db=db,
            section_id=section_update_request.section_id
        )
        exist_section_label_ids = [label.id for label in exist_section_labels]
        new_section_label_ids = [label_id for label_id in section_update_request.labels if label_id not in exist_section_label_ids]
        crud.section.create_section_labels(
            db=db,
            section_id=section_update_request.section_id,
            label_ids=new_section_label_ids
        )
        labels_to_delete = [label.id for label in exist_section_labels if label.id not in section_update_request.labels]
        crud.section.delete_section_labels_by_label_ids(
            db=db,
            label_ids=labels_to_delete
        )
    if section_update_request.auto_podcast is not None:
        db_section.auto_podcast = section_update_request.auto_podcast
    if section_update_request.auto_illustration is not None:
        db_section.auto_illustration = section_update_request.auto_illustration

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id
    )
    next_trigger_type = (
        section_update_request.process_task_trigger_type
        if section_update_request.process_task_trigger_type is not None
        else db_section_process_task.trigger_type
        if db_section_process_task is not None
        else SectionProcessTriggerType.UPDATED
    )
    if next_trigger_type == SectionProcessTriggerType.SCHEDULER:
        if db_section_process_task is None:
            db_section_process_task = crud.task.create_section_process_task(
                db=db,
                user_id=user.id,
                section_id=db_section.id,
                trigger_type=SectionProcessTriggerType.SCHEDULER,
            )
        else:
            db_section_process_task.trigger_type = SectionProcessTriggerType.SCHEDULER
    elif (
        db_section_process_task is not None
        and section_update_request.process_task_trigger_type is not None
    ):
        db_section_process_task.trigger_type = SectionProcessTriggerType.UPDATED

    db_section_process_task_trigger_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if section_update_request.process_task_trigger_scheduler is not None:
        if db_section_process_task is None:
            raise schemas.error.CustomException("Scheduler cron expression is only valid for scheduled trigger", code=400)
        stored_cron_expr = encode_cron_expr_with_timezone(
            cron_expr=section_update_request.process_task_trigger_scheduler,
            timezone_name=request_timezone,
        )
        if db_section_process_task_trigger_scheduler is None:
            db_section_process_task_trigger_scheduler = crud.task.create_section_process_task_trigger_scheduler(
                db=db,
                section_process_task_id=db_section_process_task.id,
                cron_expr=stored_cron_expr,
            )
        else:
            db_section_process_task_trigger_scheduler.cron_expr = stored_cron_expr

    should_sync_schedule = (
        section_update_request.process_task_trigger_type is not None
        or section_update_request.process_task_trigger_scheduler is not None
    )
    if should_sync_schedule:
        _remove_section_process_schedule(db_section.id)

        if next_trigger_type == SectionProcessTriggerType.SCHEDULER:
            scheduler_timezone = request_timezone
            scheduler_cron_expr = section_update_request.process_task_trigger_scheduler

            if scheduler_cron_expr is None:
                if db_section_process_task_trigger_scheduler is None:
                    raise schemas.error.CustomException("Scheduler cron expression is required", code=400)
                scheduler_timezone, scheduler_cron_expr = decode_cron_expr_with_timezone(
                    db_section_process_task_trigger_scheduler.cron_expr
                )

            if scheduler_cron_expr is None:
                raise schemas.error.CustomException("Scheduler cron expression is required", code=400)

            _schedule_section_process(
                db=db,
                db_section=db_section,
                cron_expr=scheduler_cron_expr,
                timezone_name=scheduler_timezone,
            )

    db_section.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/delete', response_model=schemas.common.NormalResponse)
def delete_section(
    section_delete_request: schemas.section.SectionDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_delete_request.section_id,
        user_id=user.id
    )
    if db_section_user is None or db_section_user.role not in [UserSectionRole.CREATOR]:
        raise schemas.error.CustomException("You don't have permission to delete this section", code=403)

    crud.section.delete_section_users_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_documents_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_labels_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_comments_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    db.commit()
    db_users = crud.section.get_users_for_section_by_section_id(
        db=db,
        section_id=section_delete_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.SUBSCRIBER]
    )
    for db_user in db_users:
        if db_user.id != user.id:
            start_trigger_user_notification_event.delay(
                user_id=db_user.id,
                trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
                params={
                    "section_id": section_delete_request.section_id,
                    "user_id": db_user.id
                }
            )
    return schemas.common.SuccessResponse()
