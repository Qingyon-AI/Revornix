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
from common.dependencies import get_current_user, get_db
from enums.notification import NotificationTriggerEventUUID
from enums.section import (
    SectionPodcastStatus,
    SectionProcessStatus,
    SectionProcessTriggerType,
    UserSectionAuthority,
    UserSectionRole,
)
from router.section_comment_manage import section_comment_manage_router
from router.section_detail_query import section_detail_query_router
from router.section_label_manage import section_label_manage_router
from router.section_publish_manage import section_publish_manage_router
from router.section_search_query import section_search_query_router
from router.section_subscription_manage import section_subscription_manage_router
from router.section_user_manage import section_user_manage_router
from router.section_user_query import section_user_query_router

section_router = APIRouter()
section_router.include_router(section_comment_manage_router)
section_router.include_router(section_user_manage_router)
section_router.include_router(section_label_manage_router)
section_router.include_router(section_publish_manage_router)
section_router.include_router(section_user_query_router)
section_router.include_router(section_search_query_router)
section_router.include_router(section_detail_query_router)
section_router.include_router(section_subscription_manage_router)

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
    user: models.user.User = Depends(get_current_user)
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

    if section_create_request.process_task_trigger_scheduler is not None:
        crud.task.create_section_process_task_trigger_scheduler(
            db=db,
            section_process_task_id=db_section_process_task.id,
            cron_expr=section_create_request.process_task_trigger_scheduler
        )
        db.commit()
        if db_section_process_task.trigger_type == SectionProcessTriggerType.SCHEDULER:
            scheduler.add_job(
                func=start_process_section,
                kwargs={
                    "section_id": db_section.id,
                    "user_id": db_section.creator_id,
                    "auto_podcast": db_section.auto_podcast
                },
                trigger=CronTrigger.from_crontab(section_create_request.process_task_trigger_scheduler),
                id=f"section-process-{db_section.id!s}"
            )
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

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
