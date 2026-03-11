from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger
from celery import chain
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.apscheduler.app import scheduler
from common.celery.app import (
    start_process_section,
    start_process_section_podcast,
    start_trigger_user_notification_event,
    update_section_process_status,
)
from common.dependencies import get_current_user, get_db, get_request_timezone
from common.timezone import (
    decode_cron_expr_with_timezone,
    encode_cron_expr_with_timezone,
    normalize_timezone_name,
)
from enums.notification import NotificationTriggerEventUUID
from enums.section import (
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


def _section_process_job_id(section_id: int) -> str:
    return f"section-process-{section_id!s}"


def _remove_section_process_schedule(section_id: int) -> None:
    job_id = _section_process_job_id(section_id)
    job = scheduler.get_job(job_id)
    if job is not None:
        scheduler.remove_job(job_id)


def _schedule_section_process(
    *,
    db_section: models.section.Section,
    cron_expr: str,
    timezone_name: str,
) -> None:
    scheduler.add_job(
        func=start_process_section,
        kwargs={
            "section_id": db_section.id,
            "user_id": db_section.creator_id,
            "auto_podcast": db_section.auto_podcast
        },
        trigger=CronTrigger.from_crontab(
            cron_expr,
            timezone=ZoneInfo(normalize_timezone_name(timezone_name)),
        ),
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
        raise schemas.error.CustomException('The section you want to generate the podcast is not found', code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException('You are not the creator of this section, so you can not generate the podcast', code=403)

    if user.default_user_file_system is None:
        raise schemas.error.CustomException('Please set the default file system for the user first.', code=400)

    db_exist_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == SectionPodcastStatus.SUCCESS:
            raise schemas.error.CustomException('The podcast task is already finished, please refresh the page', code=409)
        if db_exist_podcast_task.status == SectionPodcastStatus.WAIT_TO:
            raise schemas.error.CustomException('The podcast task is already in the queue, please wait', code=409)
        if db_exist_podcast_task.status == SectionPodcastStatus.GENERATING:
            raise schemas.error.CustomException('The podcast task is already processing, please wait', code=409)
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=generate_podcast_request.section_id
        )
    db_section_process_task.status = SectionProcessStatus.WAIT_TO
    db.commit()
    workflow = chain(
        start_process_section_podcast.si(db_section.id, user.id),
        update_section_process_status.si(db_section.id, SectionProcessStatus.SUCCESS)
    )
    workflow()
    return schemas.common.SuccessResponse()

@section_router.post('/create', response_model=schemas.section.SectionCreateResponse)
def create_section(
    section_create_request: schemas.section.SectionCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
    request_timezone: str = Depends(get_request_timezone),
):
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
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_section.id
        )
    db_section_process_task.trigger_type = section_create_request.process_task_trigger_type

    if (
        section_create_request.process_task_trigger_type == SectionProcessTriggerType.SCHEDULER
        and section_create_request.process_task_trigger_scheduler is None
    ):
        raise schemas.error.CustomException("trigger scheduler cron cannot be empty", code=400)

    if section_create_request.process_task_trigger_scheduler is not None:
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
                db_section=db_section,
                cron_expr=section_create_request.process_task_trigger_scheduler,
                timezone_name=request_timezone,
            )
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

@section_router.post("/update", response_model=schemas.common.NormalResponse)
def update_section(
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
        raise schemas.error.CustomException("The section is not exist", code=404)

    section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=user.id,
        section_id=section_update_request.section_id
    )
    if section_user is None or section_user.authority not in [UserSectionAuthority.READ_AND_WRITE, UserSectionAuthority.FULL_ACCESS]:
        raise schemas.error.CustomException("You are forbidden to modify this section", code=403)

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
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_section.id,
        )
    if section_update_request.process_task_trigger_type is not None:
        db_section_process_task.trigger_type = section_update_request.process_task_trigger_type

    db_section_process_task_trigger_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if section_update_request.process_task_trigger_scheduler is not None:
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

        if db_section_process_task.trigger_type == SectionProcessTriggerType.SCHEDULER:
            scheduler_timezone = request_timezone
            scheduler_cron_expr = section_update_request.process_task_trigger_scheduler

            if scheduler_cron_expr is None:
                if db_section_process_task_trigger_scheduler is None:
                    raise schemas.error.CustomException("trigger scheduler cron cannot be empty", code=400)
                scheduler_timezone, scheduler_cron_expr = decode_cron_expr_with_timezone(
                    db_section_process_task_trigger_scheduler.cron_expr
                )

            if scheduler_cron_expr is None:
                raise schemas.error.CustomException("trigger scheduler cron cannot be empty", code=400)

            _schedule_section_process(
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
        raise schemas.error.CustomException("You are forbidden to delete this section", code=403)

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
