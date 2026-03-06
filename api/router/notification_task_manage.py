from datetime import datetime, timezone

from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.apscheduler.app import scheduler, send_notification_scheduler
from common.dependencies import get_current_user, get_db
from enums.notification import NotificationContentType, NotificationTriggerType

notification_task_manage_router = APIRouter()


def _remove_task_schedule(notification_task_id: int) -> None:
    job_exist = scheduler.get_job(str(notification_task_id))
    if job_exist is not None:
        scheduler.remove_job(str(notification_task_id))


def _get_scheduler_cron_expr(
    *,
    db: Session,
    notification_task_id: int,
    request_cron_expr: str | None,
) -> str:
    if request_cron_expr:
        return request_cron_expr

    db_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
        db=db,
        notification_task_id=notification_task_id,
    )
    if db_trigger_scheduler is None:
        raise schemas.error.CustomException(message="notification task trigger scheduler not found", code=404)
    if not db_trigger_scheduler.cron_expr:
        raise schemas.error.CustomException(message="trigger scheduler cron cannot be empty", code=400)

    return db_trigger_scheduler.cron_expr


def _schedule_task(
    *,
    db: Session,
    notification_task_id: int,
    notification_target_id: int,
    cron_expr: str,
) -> None:
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=notification_target_id,
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)

    scheduler.add_job(
        func=send_notification_scheduler,
        trigger=CronTrigger.from_crontab(cron_expr),
        args=[db_notification_target.creator_id, notification_task_id],
        id=str(notification_task_id),
        next_run_time=datetime.now(timezone.utc),
    )


@notification_task_manage_router.post('/template/all', response_model=schemas.notification.NotificationTemplatesResponse)
def get_notification_templates(
    _user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_notification_templates = crud.notification.get_all_notification_templates(
        db=db
    )
    data = [
        schemas.notification.NotificationTemplate.model_validate(db_notification_template)
        for db_notification_template in db_notification_templates
    ]
    return schemas.notification.NotificationTemplatesResponse(data=data)

@notification_task_manage_router.post('/trigger-event/all', response_model=schemas.notification.TriggerEventsResponse)
def get_trigger_events(
    _user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_trigger_events = crud.notification.get_all_trigger_events(
        db=db
    )
    data = [
        schemas.notification.TriggerEvent.model_validate(db_trigger_event)
        for db_trigger_event in db_trigger_events
    ]
    return schemas.notification.TriggerEventsResponse(data=data)

@notification_task_manage_router.post('/task/add', response_model=schemas.common.NormalResponse)
def add_notification_task(
    add_notification_task_request: schemas.notification.AddNotificationTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_task = crud.notification.create_notification_task(
        db=db,
        creator_id=user.id,
        title=add_notification_task_request.title,
        content_type=add_notification_task_request.content_type,
        notification_target_id=add_notification_task_request.notification_target_id,
        notification_source_id=add_notification_task_request.notification_source_id,
        trigger_type=add_notification_task_request.trigger_type,
        enable=add_notification_task_request.enable
    )
    if add_notification_task_request.content_type == NotificationContentType.CUSTOM:
        if add_notification_task_request.notification_title is None or add_notification_task_request.notification_content is None:
            raise schemas.error.CustomException(message="The title of the notification is None", code=400)
        crud.notification.create_notification_task_content_custom(
            db=db,
            notification_task_id=db_notification_task.id,
            title=add_notification_task_request.notification_title,
            content=add_notification_task_request.notification_content,
            link=add_notification_task_request.notification_link,
            cover=add_notification_task_request.notification_cover
        )
    elif add_notification_task_request.content_type == NotificationContentType.TEMPLATE:
        if add_notification_task_request.notification_template_id is None:
            raise schemas.error.CustomException(message="The template id of the notification is None", code=400)
        crud.notification.create_notification_task_content_template(
            db=db,
            notification_task_id=db_notification_task.id,
            notification_template_id=add_notification_task_request.notification_template_id
        )

    if add_notification_task_request.trigger_type == NotificationTriggerType.SCHEDULER and add_notification_task_request.trigger_scheduler_cron:
        crud.notification.create_notification_task_trigger_scheduler(
            db=db,
            notification_task_id=db_notification_task.id,
            cron_expr=add_notification_task_request.trigger_scheduler_cron
        )
    elif add_notification_task_request.trigger_type == NotificationTriggerType.EVENT and add_notification_task_request.trigger_event_id:
        crud.notification.create_notification_task_trigger_event(
            db=db,
            notification_task_id=db_notification_task.id,
            trigger_event_id=add_notification_task_request.trigger_event_id
        )

    if add_notification_task_request.enable and add_notification_task_request.trigger_type == NotificationTriggerType.SCHEDULER:
        if add_notification_task_request.trigger_scheduler_cron is None:
            raise schemas.error.CustomException(message="trigger scheduler cron cannot be empty", code=400)
        _schedule_task(
            db=db,
            notification_task_id=db_notification_task.id,
            notification_target_id=db_notification_task.notification_target_id,
            cron_expr=add_notification_task_request.trigger_scheduler_cron,
        )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_task_manage_router.post('/task/detail', response_model=schemas.notification.NotificationTask)
def get_notification_task(
    get_notification_task_request: schemas.notification.NotificationTaskDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_task = crud.notification.get_notification_task_by_notification_task_id(
        db=db,
        notification_task_id=get_notification_task_request.notification_task_id
    )
    if db_notification_task is None:
        raise schemas.error.CustomException(message="notification task not found", code=404)
    if db_notification_task.creator_id != user.id:
        raise schemas.error.CustomException(message="permission denied", code=403)

    res = schemas.notification.NotificationTask.model_validate(db_notification_task)

    if db_notification_task.content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id
        )
        if db_notification_task_content_custom is not None:
            res.notification_title = db_notification_task_content_custom.title
            res.notification_content = db_notification_task_content_custom.content
            res.notification_cover = db_notification_task_content_custom.cover
            res.notification_link = db_notification_task_content_custom.link
    elif db_notification_task.content_type == NotificationContentType.TEMPLATE:
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id
        )
        if db_notification_task_content_template is not None:
            res.notification_template_id = db_notification_task_content_template.notification_template_id

    db_notification_source = crud.notification.get_notification_source_by_id(
        db=db,
        notification_source_id=db_notification_task.notification_source_id
    )
    if db_notification_source is not None:
        res.notification_source = schemas.notification.NotificationSource.model_validate(db_notification_source)
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=db_notification_task.notification_target_id
    )
    if db_notification_target is not None:
        res.notification_target = schemas.notification.NotificationTarget.model_validate(db_notification_target)

    if db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        db_notification_task_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id
        )
        if db_notification_task_trigger_scheduler is not None:
            res.trigger_scheduler = db_notification_task_trigger_scheduler
    elif db_notification_task.trigger_type == NotificationTriggerType.EVENT:
        db_notification_task_trigger_event = crud.notification.get_notification_task_trigger_event_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id
        )
        if db_notification_task_trigger_event is not None:
            res.trigger_event = db_notification_task_trigger_event

    return res

@notification_task_manage_router.post('/task/delete', response_model=schemas.common.NormalResponse)
def delete_notification_task(
    delete_notification_task_request: schemas.notification.DeleteNotificationTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.delete_notification_tasks(
        db=db,
        user_id=user.id,
        notification_task_ids=delete_notification_task_request.notification_task_ids
    )
    for notification_task_id in delete_notification_task_request.notification_task_ids:
        crud.notification.delete_notification_task_content_custom_by_notification_task_id(
            db=db,
            user_id=user.id,
            notification_task_id=notification_task_id
        )
        crud.notification.delete_notification_task_content_template_by_notification_task_id(
            db=db,
            user_id=user.id,
            notification_task_id=notification_task_id
        )
        _remove_task_schedule(notification_task_id)
    db.commit()
    return schemas.common.SuccessResponse()

@notification_task_manage_router.post('/task/update', response_model=schemas.common.NormalResponse)
def update_notification_task(
    update_notification_task_request: schemas.notification.UpdateNotificationTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_notification_task = crud.notification.get_notification_task_by_notification_task_id(
        db=db,
        notification_task_id=update_notification_task_request.notification_task_id
    )
    if db_notification_task is None:
        raise schemas.error.CustomException(message="notification task not found", code=404)
    if db_notification_task.creator_id != user.id:
        raise schemas.error.CustomException(message="permission denied", code=403)

    if update_notification_task_request.title is not None:
        db_notification_task.title = update_notification_task_request.title

    # 如果原先这个任务是scheduler类型，那么需要删除原先的scheduler安排
    if db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        db_origin_notification_task_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id
        )
        if db_origin_notification_task_trigger_scheduler is None:
            raise schemas.error.CustomException(message="notification task trigger scheduler not found", code=404)
        _remove_task_schedule(db_notification_task.id)

    if update_notification_task_request.content_type is not None:
        db_notification_task.content_type = update_notification_task_request.content_type

    if update_notification_task_request.content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id
        )
        if update_notification_task_request.notification_title is None or update_notification_task_request.notification_content is None:
            raise schemas.error.CustomException(message="title cannot be empty for custom notification", code=400)
        if db_notification_task_content_custom is None:
            crud.notification.create_notification_task_content_custom(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id,
                title=update_notification_task_request.notification_title,
                content=update_notification_task_request.notification_content,
                link=update_notification_task_request.notification_link,
                cover=update_notification_task_request.notification_cover
            )
        else:
            db_notification_task_content_custom.title = update_notification_task_request.notification_title
            db_notification_task_content_custom.content = update_notification_task_request.notification_content
            db_notification_task_content_custom.cover = update_notification_task_request.notification_cover
            db_notification_task_content_custom.link = update_notification_task_request.notification_link
    elif update_notification_task_request.content_type == NotificationContentType.TEMPLATE:
        if update_notification_task_request.notification_template_id is None:
            raise schemas.error.CustomException(message="notification template id cannot be empty for template notification", code=400)
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id
        )
        if db_notification_task_content_template is None:
            crud.notification.create_notification_task_content_template(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id,
                notification_template_id=update_notification_task_request.notification_template_id
            )
        else:
            db_notification_task_content_template.notification_template_id = update_notification_task_request.notification_template_id

    if update_notification_task_request.notification_source_id is not None:
        db_notification_task.notification_source_id = update_notification_task_request.notification_source_id
    if update_notification_task_request.notification_target_id is not None:
        db_notification_task.notification_target_id = update_notification_task_request.notification_target_id

    if update_notification_task_request.trigger_type is not None:
        db_notification_task.trigger_type = update_notification_task_request.trigger_type
    if update_notification_task_request.trigger_type == NotificationTriggerType.SCHEDULER:
        if update_notification_task_request.trigger_scheduler_cron is not None:
            db_notification_task_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id
            )
            if db_notification_task_trigger_scheduler is None:
                crud.notification.create_notification_task_trigger_scheduler(
                    db=db,
                    notification_task_id=update_notification_task_request.notification_task_id,
                    cron_expr=update_notification_task_request.trigger_scheduler_cron
                )
            else:
                db_notification_task_trigger_scheduler.cron_expr = update_notification_task_request.trigger_scheduler_cron
    elif update_notification_task_request.trigger_type == NotificationTriggerType.EVENT:
        if update_notification_task_request.trigger_event_id is not None:
            db_notification_task_trigger_event = crud.notification.get_notification_task_trigger_event_by_notification_task_id(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id
            )
            if db_notification_task_trigger_event is None:
                crud.notification.create_notification_task_trigger_event(
                    db=db,
                    notification_task_id=update_notification_task_request.notification_task_id,
                    trigger_event_id=update_notification_task_request.trigger_event_id
                )
            else:
                db_notification_task_trigger_event.trigger_event_id = update_notification_task_request.trigger_event_id

    if update_notification_task_request.enable is not None:
        db_notification_task.enable = update_notification_task_request.enable

    _remove_task_schedule(db_notification_task.id)
    if db_notification_task.enable and db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        cron_expr = _get_scheduler_cron_expr(
            db=db,
            notification_task_id=db_notification_task.id,
            request_cron_expr=update_notification_task_request.trigger_scheduler_cron,
        )
        _schedule_task(
            db=db,
            notification_task_id=db_notification_task.id,
            notification_target_id=db_notification_task.notification_target_id,
            cron_expr=cron_expr,
        )

    db_notification_task.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_task_manage_router.post('/task/mine', response_model=schemas.pagination.Pagination[schemas.notification.NotificationTask])
def get_mine_notification_task(
    get_mine_notification_task_request: schemas.pagination.PageableRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    elements: list[schemas.notification.NotificationTask] = []
    db_notification_tasks = crud.notification.get_notification_tasks_for_user(
        db=db,
        user_id=user.id,
        page_num=get_mine_notification_task_request.page_num,
        page_size=get_mine_notification_task_request.page_size
    )
    for db_notification_task in db_notification_tasks:
        task_data = schemas.notification.NotificationTask.model_validate(db_notification_task)
        if task_data.content_type == NotificationContentType.CUSTOM:
            db_notification_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                db=db,
                notification_task_id=task_data.id
            )
            if db_notification_content_custom is not None:
                task_data.notification_title = db_notification_content_custom.title
                task_data.notification_content = db_notification_content_custom.content
        elif task_data.content_type == NotificationContentType.TEMPLATE:
            db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
                db=db,
                notification_task_id=task_data.id
            )
            if db_notification_task_content_template is not None:
                task_data.notification_template_id = db_notification_task_content_template.notification_template_id
        task_data.notification_source = crud.notification.get_notification_source_by_id(
            db=db,
            notification_source_id=db_notification_task.notification_source_id
        )
        task_data.notification_target = crud.notification.get_notification_target_by_id(
            db=db,
            notification_target_id=db_notification_task.notification_target_id
        )
        if task_data.trigger_type == NotificationTriggerType.SCHEDULER:
            task_data.trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
                db=db,
                notification_task_id=task_data.id
            )
        elif task_data.trigger_type == NotificationTriggerType.EVENT:
            task_data.trigger_event = crud.notification.get_notification_task_trigger_event_by_notification_task_id(
                db=db,
                notification_task_id=task_data.id
            )
        elements.append(task_data)
    count = crud.notification.count_notification_tasks_for_user(
        db=db,
        user_id=user.id
    )
    total_pages = (count + get_mine_notification_task_request.page_size - 1) // get_mine_notification_task_request.page_size
    return schemas.pagination.Pagination(
        total_elements=count,
        total_pages=total_pages,
        page_num=get_mine_notification_task_request.page_num,
        page_size=get_mine_notification_task_request.page_size,
        current_page_elements=len(db_notification_tasks),
        elements=elements
    )

@notification_task_manage_router.post('/target/task', response_model=schemas.notification.GetNotificationTargetRelatedTaskResponse)
def get_notification_target_related_task(
    get_notification_target_related_task_request: schemas.notification.GetNotificationTargetRelatedTaskRequest,
    db: Session = Depends(get_db),
    _user: models.user.User = Depends(get_current_user)
):
    db_user_notification_targets = crud.notification.get_notification_task_by_notification_target_id(
        db=db,
        notification_target_id=get_notification_target_related_task_request.notification_target_id
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_target)
        for db_user_notification_target in db_user_notification_targets
    ]
    return schemas.notification.GetNotificationTargetRelatedTaskResponse(data=data)

@notification_task_manage_router.post('/source/task', response_model=schemas.notification.GetNotificationSourceRelatedTaskResponse)
def get_notification_source_related_task(
    get_notification_source_related_task_request: schemas.notification.GetNotificationSourceRelatedTaskRequest,
    db: Session = Depends(get_db),
    _user: models.user.User = Depends(get_current_user)
):
    db_user_notification_sources = crud.notification.get_notification_task_by_notification_source_id(
        db=db,
        notification_source_id=get_notification_source_related_task_request.notification_source_id
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_source)
        for db_user_notification_source in db_user_notification_sources
    ]
    return schemas.notification.GetNotificationSourceRelatedTaskResponse(data=data)
