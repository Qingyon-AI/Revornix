from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user
from enums.notification import (
    NotificationTemplate,
    NotificationTriggerEventUUID,
)

notification_task_manage_router = APIRouter()


TRIGGER_EVENT_TEMPLATE_UUID_MAP = {
    NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value: NotificationTemplate.REMOVED_FROM_SECTION.meta.uuid,
    NotificationTriggerEventUUID.SECTION_COMMENTED.value: NotificationTemplate.SECTION_COMMENTED.meta.uuid,
    NotificationTriggerEventUUID.SECTION_UPDATED.value: NotificationTemplate.SECTION_UPDATED.meta.uuid,
    NotificationTriggerEventUUID.SECTION_SUBSCRIBED.value: NotificationTemplate.SECTION_SUBSCRIBED.meta.uuid,
    NotificationTriggerEventUUID.SECTION_CONTENT_UPDATED.value: NotificationTemplate.SECTION_CONTENT_UPDATED.meta.uuid,
    NotificationTriggerEventUUID.SECTION_PODCAST_READY.value: NotificationTemplate.SECTION_PODCAST_READY.meta.uuid,
    NotificationTriggerEventUUID.SECTION_PPT_READY.value: NotificationTemplate.SECTION_PPT_READY.meta.uuid,
    NotificationTriggerEventUUID.DOCUMENT_PROCESS_COMPLETED.value: NotificationTemplate.DOCUMENT_PROCESS_COMPLETED.meta.uuid,
    NotificationTriggerEventUUID.DOCUMENT_PODCAST_READY.value: NotificationTemplate.DOCUMENT_PODCAST_READY.meta.uuid,
}


async def _validate_notification_source_target_pair(
    *,
    db: AsyncSession,
    notification_source_id: int,
    notification_target_id: int,
) -> tuple[models.notification.NotificationSource, models.notification.NotificationTarget]:
    db_notification_source = await crud.notification.get_notification_source_by_id_async(
        db=db,
        notification_source_id=notification_source_id,
    )
    if db_notification_source is None:
        raise schemas.error.CustomException(message="Notification source not found", code=404)

    db_notification_target = await crud.notification.get_notification_target_by_id_async(
        db=db,
        notification_target_id=notification_target_id,
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="Notification target not found", code=404)

    db_source_provided = await crud.notification.get_notification_source_provided_by_id_async(
        db=db,
        id=db_notification_source.notification_source_provided_id,
    )
    db_target_provided = await crud.notification.get_notification_target_provided_by_id_async(
        db=db,
        id=db_notification_target.notification_target_provided_id,
    )
    if db_source_provided is None or db_target_provided is None:
        raise schemas.error.CustomException(message="Notification source or target type not found", code=404)
    if db_source_provided.category != db_target_provided.category:
        raise schemas.error.CustomException(
            message=f"Source category '{db_source_provided.category}' does not match target category '{db_target_provided.category}'",
            code=400,
        )

    return db_notification_source, db_notification_target


async def _resolve_notification_template_for_trigger_event(
    *,
    db: AsyncSession,
    trigger_event_id: int,
) -> tuple[models.notification.TriggerEvent, models.notification.NotificationTemplate]:
    db_trigger_event = await crud.notification.get_trigger_event_by_id_async(
        db=db,
        trigger_event_id=trigger_event_id,
    )
    if db_trigger_event is None:
        raise schemas.error.CustomException(message="Trigger event not found", code=404)

    template_uuid = TRIGGER_EVENT_TEMPLATE_UUID_MAP.get(db_trigger_event.uuid)
    if template_uuid is None:
        raise schemas.error.CustomException(
            message="No notification template is configured for this trigger event",
            code=400,
        )

    db_notification_template = await crud.notification.get_notification_template_by_uuid_async(
        db=db,
        uuid=template_uuid,
    )
    if db_notification_template is None:
        raise schemas.error.CustomException(message="Notification template not found", code=404)

    return db_trigger_event, db_notification_template


async def _sync_notification_task_event_configuration(
    *,
    db: AsyncSession,
    notification_task_id: int,
    trigger_event_id: int,
) -> None:
    _db_trigger_event, db_notification_template = await _resolve_notification_template_for_trigger_event(
        db=db,
        trigger_event_id=trigger_event_id,
    )

    db_notification_task_trigger_event = await crud.notification.get_notification_task_trigger_event_by_notification_task_id_async(
        db=db,
        notification_task_id=notification_task_id,
    )
    if db_notification_task_trigger_event is None:
        await crud.notification.create_notification_task_trigger_event_async(
            db=db,
            notification_task_id=notification_task_id,
            trigger_event_id=trigger_event_id,
        )
    else:
        db_notification_task_trigger_event.trigger_event_id = trigger_event_id

    db_notification_task_content_template = await crud.notification.get_notification_task_content_template_by_notification_task_id_async(
        db=db,
        notification_task_id=notification_task_id,
    )
    if db_notification_task_content_template is None:
        await crud.notification.create_notification_task_content_template_async(
            db=db,
            notification_task_id=notification_task_id,
            notification_template_id=db_notification_template.id,
        )
    else:
        db_notification_task_content_template.notification_template_id = db_notification_template.id


async def _build_notification_task_response(
    *,
    db: AsyncSession,
    db_notification_task: models.notification.NotificationTask,
) -> schemas.notification.NotificationTask:
    task_data = schemas.notification.NotificationTask.model_validate(db_notification_task)

    db_notification_task_content_template = await crud.notification.get_notification_task_content_template_by_notification_task_id_async(
        db=db,
        notification_task_id=db_notification_task.id,
    )
    if db_notification_task_content_template is not None:
        task_data.notification_template_id = db_notification_task_content_template.notification_template_id

    db_notification_source = await crud.notification.get_notification_source_by_id_async(
        db=db,
        notification_source_id=db_notification_task.notification_source_id,
    )
    if db_notification_source is not None:
        task_data.notification_source = schemas.notification.NotificationSource.model_validate(db_notification_source)

    db_notification_target = await crud.notification.get_notification_target_by_id_async(
        db=db,
        notification_target_id=db_notification_task.notification_target_id,
    )
    if db_notification_target is not None:
        task_data.notification_target = schemas.notification.NotificationTarget.model_validate(db_notification_target)

    db_notification_task_trigger_event = await crud.notification.get_notification_task_trigger_event_by_notification_task_id_async(
        db=db,
        notification_task_id=db_notification_task.id,
    )
    if db_notification_task_trigger_event is not None:
        task_data.trigger_event = schemas.notification.NotificationTriggerEvent.model_validate(
            db_notification_task_trigger_event
        )

    return task_data


@notification_task_manage_router.post('/template/all', response_model=schemas.notification.NotificationTemplatesResponse)
async def get_notification_templates(
    _user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_notification_templates = await crud.notification.get_all_notification_templates_async(db=db)
    data = [
        schemas.notification.NotificationTemplate.model_validate(db_notification_template)
        for db_notification_template in db_notification_templates
    ]
    return schemas.notification.NotificationTemplatesResponse(data=data)


@notification_task_manage_router.post('/trigger-event/all', response_model=schemas.notification.TriggerEventsResponse)
async def get_trigger_events(
    _user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_trigger_events = await crud.notification.get_all_trigger_events_async(db=db)
    data = [
        schemas.notification.TriggerEvent.model_validate(db_trigger_event)
        for db_trigger_event in db_trigger_events
    ]
    return schemas.notification.TriggerEventsResponse(data=data)


@notification_task_manage_router.post('/task/add', response_model=schemas.common.NormalResponse)
async def add_notification_task(
    add_notification_task_request: schemas.notification.AddNotificationTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await _validate_notification_source_target_pair(
        db=db,
        notification_source_id=add_notification_task_request.notification_source_id,
        notification_target_id=add_notification_task_request.notification_target_id,
    )
    if add_notification_task_request.trigger_event_id is None:
        raise schemas.error.CustomException(message="Trigger event ID is required", code=400)

    db_notification_task = await crud.notification.create_notification_task_async(
        db=db,
        creator_id=user.id,
        title=add_notification_task_request.title,
        notification_target_id=add_notification_task_request.notification_target_id,
        notification_source_id=add_notification_task_request.notification_source_id,
        enable=add_notification_task_request.enable,
    )
    await _sync_notification_task_event_configuration(
        db=db,
        notification_task_id=db_notification_task.id,
        trigger_event_id=add_notification_task_request.trigger_event_id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@notification_task_manage_router.post('/task/detail', response_model=schemas.notification.NotificationTask)
async def get_notification_task(
    get_notification_task_request: schemas.notification.NotificationTaskDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_notification_task = await crud.notification.get_notification_task_by_notification_task_id_async(
        db=db,
        notification_task_id=get_notification_task_request.notification_task_id,
    )
    if db_notification_task is None:
        raise schemas.error.CustomException(message="Notification task not found", code=404)
    if db_notification_task.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to manage this notification task", code=403)
    return await _build_notification_task_response(
        db=db,
        db_notification_task=db_notification_task,
    )


@notification_task_manage_router.post('/task/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_task(
    delete_notification_task_request: schemas.notification.DeleteNotificationTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await crud.notification.delete_notification_tasks_async(
        db=db,
        user_id=user.id,
        notification_task_ids=delete_notification_task_request.notification_task_ids,
    )
    for notification_task_id in delete_notification_task_request.notification_task_ids:
        await crud.notification.delete_notification_task_content_template_by_notification_task_id_async(
            db=db,
            user_id=user.id,
            notification_task_id=notification_task_id,
        )
    await db.commit()
    return schemas.common.SuccessResponse()


@notification_task_manage_router.post('/task/update', response_model=schemas.common.NormalResponse)
async def update_notification_task(
    update_notification_task_request: schemas.notification.UpdateNotificationTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(tz=timezone.utc)
    db_notification_task = await crud.notification.get_notification_task_by_notification_task_id_async(
        db=db,
        notification_task_id=update_notification_task_request.notification_task_id,
    )
    if db_notification_task is None:
        raise schemas.error.CustomException(message="Notification task not found", code=404)
    if db_notification_task.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to manage this notification task", code=403)

    if update_notification_task_request.title is not None:
        db_notification_task.title = update_notification_task_request.title

    if update_notification_task_request.notification_source_id is not None or update_notification_task_request.notification_target_id is not None:
        final_source_id = update_notification_task_request.notification_source_id or db_notification_task.notification_source_id
        final_target_id = update_notification_task_request.notification_target_id or db_notification_task.notification_target_id
        await _validate_notification_source_target_pair(
            db=db,
            notification_source_id=final_source_id,
            notification_target_id=final_target_id,
        )
    if update_notification_task_request.notification_source_id is not None:
        db_notification_task.notification_source_id = update_notification_task_request.notification_source_id
    if update_notification_task_request.notification_target_id is not None:
        db_notification_task.notification_target_id = update_notification_task_request.notification_target_id

    if update_notification_task_request.trigger_event_id is not None:
        await _sync_notification_task_event_configuration(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id,
            trigger_event_id=update_notification_task_request.trigger_event_id,
        )

    if update_notification_task_request.enable is not None:
        db_notification_task.enable = update_notification_task_request.enable

    db_notification_task.update_time = now
    await db.commit()
    return schemas.common.SuccessResponse()


@notification_task_manage_router.post('/task/mine', response_model=schemas.pagination.Pagination[schemas.notification.NotificationTask])
async def get_mine_notification_task(
    get_mine_notification_task_request: schemas.pagination.PageableRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    elements: list[schemas.notification.NotificationTask] = []
    db_notification_tasks = await crud.notification.get_notification_tasks_for_user_async(
        db=db,
        user_id=user.id,
        page_num=get_mine_notification_task_request.page_num,
        page_size=get_mine_notification_task_request.page_size,
    )
    for db_notification_task in db_notification_tasks:
        elements.append(
            await _build_notification_task_response(
                db=db,
                db_notification_task=db_notification_task,
            )
        )
    count = await crud.notification.count_notification_tasks_for_user_async(
        db=db,
        user_id=user.id,
    )
    total_pages = (count + get_mine_notification_task_request.page_size - 1) // get_mine_notification_task_request.page_size
    return schemas.pagination.Pagination(
        total_elements=count,
        total_pages=total_pages,
        page_num=get_mine_notification_task_request.page_num,
        page_size=get_mine_notification_task_request.page_size,
        current_page_elements=len(db_notification_tasks),
        elements=elements,
    )


@notification_task_manage_router.post('/target/task', response_model=schemas.notification.GetNotificationTargetRelatedTaskResponse)
async def get_notification_target_related_task(
    get_notification_target_related_task_request: schemas.notification.GetNotificationTargetRelatedTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    _user: models.user.User = Depends(get_current_user),
):
    db_user_notification_targets = await crud.notification.get_notification_task_by_notification_target_id_async(
        db=db,
        notification_target_id=get_notification_target_related_task_request.notification_target_id,
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_target)
        for db_user_notification_target in db_user_notification_targets
    ]
    return schemas.notification.GetNotificationTargetRelatedTaskResponse(data=data)


@notification_task_manage_router.post('/source/task', response_model=schemas.notification.GetNotificationSourceRelatedTaskResponse)
async def get_notification_source_related_task(
    get_notification_source_related_task_request: schemas.notification.GetNotificationSourceRelatedTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    _user: models.user.User = Depends(get_current_user),
):
    db_user_notification_sources = await crud.notification.get_notification_task_by_notification_source_id_async(
        db=db,
        notification_source_id=get_notification_source_related_task_request.notification_source_id,
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_source)
        for db_user_notification_source in db_user_notification_sources
    ]
    return schemas.notification.GetNotificationSourceRelatedTaskResponse(data=data)
