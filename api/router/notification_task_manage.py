from datetime import datetime, timezone
import json
from uuid import uuid4

from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.apscheduler.app import scheduler, send_notification_scheduler
from common.dependencies import get_current_user, get_db
from enums.notification import NotificationContentType, NotificationTriggerType, UserNotificationTemplateRole

notification_task_manage_router = APIRouter()


def _serialize_notification_template_binding_map(
    bindings: dict[str, schemas.notification.NotificationTemplateBinding] | None,
) -> str | None:
    if not bindings:
        return None
    return json.dumps(
        {key: value.model_dump() for key, value in bindings.items()},
        ensure_ascii=False,
    )


def _deserialize_notification_template_binding_map(
    bindings_json: str | None,
) -> dict[str, schemas.notification.NotificationTemplateBinding] | None:
    if not bindings_json:
        return None
    data = json.loads(bindings_json)
    if not isinstance(data, dict):
        return None
    return {
        key: schemas.notification.NotificationTemplateBinding.model_validate(value)
        for key, value in data.items()
    }


def _build_notification_template_schema(
    *,
    db: Session,
    user_id: int,
    db_notification_template: models.notification.NotificationTemplate,
) -> schemas.notification.NotificationTemplate:
    template_data = schemas.notification.NotificationTemplate.model_validate(db_notification_template)
    template_data.is_forked = crud.notification.get_user_notification_template_by_user_id_and_notification_template_id(
        db=db,
        user_id=user_id,
        notification_template_id=db_notification_template.id,
        filter_role=UserNotificationTemplateRole.FORKER,
    ) is not None
    template_data.parameters = [
        schemas.notification.NotificationTemplateParameter.model_validate(item)
        for item in crud.notification.get_notification_template_parameters_by_template_id(
            db=db,
            notification_template_id=db_notification_template.id,
        )
    ]
    return template_data


def _build_trigger_event_schema(
    *,
    db: Session,
    db_trigger_event: models.notification.TriggerEvent,
) -> schemas.notification.TriggerEvent:
    trigger_event_data = schemas.notification.TriggerEvent.model_validate(db_trigger_event)
    trigger_event_data.attributes = [
        schemas.notification.TriggerEventAttribute.model_validate(item)
        for item in crud.notification.get_trigger_event_attributes_by_trigger_event_id(
            db=db,
            trigger_event_id=db_trigger_event.id,
        )
    ]
    return trigger_event_data


def _replace_template_variables(
    template: str | None,
    values: dict[str, object],
) -> str | None:
    if template is None:
        return None
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", "" if value is None else str(value))
    return rendered


def _validate_and_sync_template_parameters(
    *,
    db: Session,
    db_notification_template: models.notification.NotificationTemplate,
    parameters: list[schemas.notification.NotificationTemplateParameterUpsertRequest],
) -> None:
    now = datetime.now(timezone.utc)
    existing_parameters = {
        item.key: item
        for item in crud.notification.get_notification_template_parameters_by_template_id(
            db=db,
            notification_template_id=db_notification_template.id,
        )
    }
    incoming_keys: set[str] = set()
    for parameter in parameters:
        if parameter.key in incoming_keys:
            raise schemas.error.CustomException(message=f"Duplicate template parameter key: {parameter.key}", code=400)
        incoming_keys.add(parameter.key)
        existing_parameter = existing_parameters.get(parameter.key)
        if existing_parameter is None:
            crud.notification.create_notification_template_parameter(
                db=db,
                notification_template_id=db_notification_template.id,
                key=parameter.key,
                label=parameter.label,
                label_zh=parameter.label,
                description=parameter.description,
                description_zh=parameter.description,
                value_type=parameter.value_type,
                required=parameter.required,
                default_value=parameter.default_value,
            )
            continue
        existing_parameter.label = parameter.label
        existing_parameter.label_zh = parameter.label
        existing_parameter.description = parameter.description
        existing_parameter.description_zh = parameter.description
        existing_parameter.value_type = parameter.value_type
        existing_parameter.required = parameter.required
        existing_parameter.default_value = parameter.default_value
        existing_parameter.update_time = now

    for key, existing_parameter in existing_parameters.items():
        if key not in incoming_keys:
            existing_parameter.delete_at = now
            existing_parameter.update_time = now


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
        raise schemas.error.CustomException(message="Notification task scheduler not found", code=404)
    if not db_trigger_scheduler.cron_expr:
        raise schemas.error.CustomException(message="Scheduler cron expression is required", code=400)

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
        raise schemas.error.CustomException(message="Notification target not found", code=404)

    scheduler.add_job(
        func=send_notification_scheduler,
        trigger=CronTrigger.from_crontab(cron_expr),
        args=[db_notification_target.creator_id, notification_task_id],
        id=str(notification_task_id),
        next_run_time=datetime.now(timezone.utc),
    )


def _build_notification_task_response(
    *,
    db: Session,
    db_notification_task: models.notification.NotificationTask,
) -> schemas.notification.NotificationTask:
    task_data = schemas.notification.NotificationTask.model_validate(db_notification_task)

    if db_notification_task.content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id,
        )
        if db_notification_task_content_custom is not None:
            task_data.notification_title = db_notification_task_content_custom.title
            task_data.notification_content = db_notification_task_content_custom.content
            task_data.notification_cover = db_notification_task_content_custom.cover
            task_data.notification_link = db_notification_task_content_custom.link
    elif db_notification_task.content_type == NotificationContentType.TEMPLATE:
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id,
        )
        if db_notification_task_content_template is not None:
            task_data.notification_template_id = db_notification_task_content_template.notification_template_id
            task_data.notification_template_bindings = _deserialize_notification_template_binding_map(
                db_notification_task_content_template.parameter_bindings_json
            )

    db_notification_source = crud.notification.get_notification_source_by_id(
        db=db,
        notification_source_id=db_notification_task.notification_source_id,
    )
    if db_notification_source is not None:
        task_data.notification_source = schemas.notification.NotificationSource.model_validate(db_notification_source)

    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=db_notification_task.notification_target_id,
    )
    if db_notification_target is not None:
        task_data.notification_target = schemas.notification.NotificationTarget.model_validate(db_notification_target)

    if db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        db_notification_task_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id,
        )
        if db_notification_task_trigger_scheduler is not None:
            task_data.trigger_scheduler = schemas.notification.NotificationTriggerScheduler.model_validate(
                db_notification_task_trigger_scheduler
            )
    elif db_notification_task.trigger_type == NotificationTriggerType.EVENT:
        db_notification_task_trigger_event = crud.notification.get_notification_task_trigger_event_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id,
        )
        if db_notification_task_trigger_event is not None:
            task_data.trigger_event = schemas.notification.NotificationTriggerEvent.model_validate(
                db_notification_task_trigger_event
            )

    return task_data


@notification_task_manage_router.post('/template/all', response_model=schemas.notification.NotificationTemplatesResponse)
def get_notification_templates(
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_notification_templates = crud.notification.get_notification_templates_for_user(db=db, user_id=user.id)
    data = [
        _build_notification_template_schema(db=db, user_id=user.id, db_notification_template=db_notification_template)
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
        _build_trigger_event_schema(db=db, db_trigger_event=db_trigger_event)
        for db_trigger_event in db_trigger_events
    ]
    return schemas.notification.TriggerEventsResponse(data=data)

@notification_task_manage_router.post('/template/upsert', response_model=schemas.common.NormalResponse)
def upsert_notification_template(
    request: schemas.notification.NotificationTemplateUpsertRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(tz=timezone.utc)
    db_notification_template: models.notification.NotificationTemplate | None = None
    if request.notification_template_id is not None:
        db_notification_template = crud.notification.get_notification_template_by_id(
            db=db,
            notification_template_id=request.notification_template_id,
        )
        if db_notification_template is None:
            raise schemas.error.CustomException(message="Notification template not found", code=404)
        if db_notification_template.creator_id != user.id:
            raise schemas.error.CustomException(message="You don't have permission to edit this notification template", code=403)
        db_notification_template.name = request.name
        db_notification_template.name_zh = request.name
        db_notification_template.description = request.description
        db_notification_template.description_zh = request.description
        db_notification_template.title_template = request.title_template
        db_notification_template.content_template = request.content_template
        db_notification_template.link_template = request.link_template
        db_notification_template.cover_template = request.cover_template
        db_notification_template.is_public = request.is_public
        db_notification_template.update_time = now
    else:
        db_notification_template = crud.notification.create_notification_template(
            db=db,
            uuid=uuid4().hex,
            creator_id=user.id,
            name=request.name,
            name_zh=request.name,
            description=request.description,
            description_zh=request.description,
            title_template=request.title_template,
            content_template=request.content_template,
            link_template=request.link_template,
            cover_template=request.cover_template,
            is_public=request.is_public,
        )
        crud.notification.create_user_notification_template(
            db=db,
            user_id=user.id,
            notification_template_id=db_notification_template.id,
            role=UserNotificationTemplateRole.CREATOR,
        )
    _validate_and_sync_template_parameters(
        db=db,
        db_notification_template=db_notification_template,
        parameters=request.parameters,
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_task_manage_router.post('/template/delete', response_model=schemas.common.NormalResponse)
def delete_notification_template(
    request: schemas.notification.DeleteNotificationTemplateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(tz=timezone.utc)
    db_notification_template = crud.notification.get_notification_template_by_id(
        db=db,
        notification_template_id=request.notification_template_id,
    )
    if db_notification_template is None:
        raise schemas.error.CustomException(message="Notification template not found", code=404)
    if db_notification_template.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to delete this notification template", code=403)
    if crud.notification.count_notification_task_contents_by_template_id(
        db=db,
        notification_template_id=db_notification_template.id,
    ) > 0:
        raise schemas.error.CustomException(
            message="Notification template is still used by existing tasks",
            code=400,
        )
    db_notification_template.delete_at = now
    db_notification_template.update_time = now
    db_user_notification_template = crud.notification.get_user_notification_template_by_user_id_and_notification_template_id(
        db=db,
        user_id=user.id,
        notification_template_id=db_notification_template.id,
        filter_role=UserNotificationTemplateRole.CREATOR,
    )
    if db_user_notification_template is not None:
        db_user_notification_template.delete_at = now
        db_user_notification_template.update_time = now
    for db_parameter in crud.notification.get_notification_template_parameters_by_template_id(
        db=db,
        notification_template_id=db_notification_template.id,
    ):
        db_parameter.delete_at = now
        db_parameter.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_task_manage_router.post('/task/add', response_model=schemas.common.NormalResponse)
def add_notification_task(
    add_notification_task_request: schemas.notification.AddNotificationTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source = crud.notification.get_notification_source_by_id(
        db=db,
        notification_source_id=add_notification_task_request.notification_source_id,
    )
    if db_notification_source is None:
        raise schemas.error.CustomException(message="Notification source not found", code=404)
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=add_notification_task_request.notification_target_id,
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="Notification target not found", code=404)
    db_source_provided = crud.notification.get_notification_source_provided_by_id(
        db=db,
        id=db_notification_source.notification_source_provided_id,
    )
    db_target_provided = crud.notification.get_notification_target_provided_by_id(
        db=db,
        id=db_notification_target.notification_target_provided_id,
    )
    if db_source_provided is None or db_target_provided is None:
        raise schemas.error.CustomException(message="Notification source or target type not found", code=404)
    if db_source_provided.category != db_target_provided.category:
        raise schemas.error.CustomException(
            message=f"Source category '{db_source_provided.category}' does not match target category '{db_target_provided.category}'",
            code=400
        )
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
            raise schemas.error.CustomException(message="Notification title is required", code=400)
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
            raise schemas.error.CustomException(message="Notification template ID is required", code=400)
        db_notification_template = crud.notification.get_notification_template_by_id(
            db=db,
            notification_template_id=add_notification_task_request.notification_template_id,
        )
        if db_notification_template is None:
            raise schemas.error.CustomException(message="Notification template not found", code=404)
        if crud.notification.get_user_notification_template_by_user_id_and_notification_template_id(
            db=db,
            user_id=user.id,
            notification_template_id=db_notification_template.id,
        ) is None:
            raise schemas.error.CustomException(message="You don't have permission to use this notification template", code=403)
        crud.notification.create_notification_task_content_template(
            db=db,
            notification_task_id=db_notification_task.id,
            notification_template_id=add_notification_task_request.notification_template_id,
            parameter_bindings_json=_serialize_notification_template_binding_map(
                add_notification_task_request.notification_template_bindings
            ),
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
            raise schemas.error.CustomException(message="Scheduler cron expression is required", code=400)
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
        raise schemas.error.CustomException(message="Notification task not found", code=404)
    if db_notification_task.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to manage this notification task", code=403)
    return _build_notification_task_response(
        db=db,
        db_notification_task=db_notification_task,
    )

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
        raise schemas.error.CustomException(message="Notification task not found", code=404)
    if db_notification_task.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to manage this notification task", code=403)

    if update_notification_task_request.title is not None:
        db_notification_task.title = update_notification_task_request.title

    # 如果原先这个任务是scheduler类型，那么需要删除原先的scheduler安排
    if db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        db_origin_notification_task_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id
        )
        if db_origin_notification_task_trigger_scheduler is None:
            raise schemas.error.CustomException(message="Notification task scheduler not found", code=404)
        _remove_task_schedule(db_notification_task.id)

    effective_content_type = update_notification_task_request.content_type
    if effective_content_type is None:
        effective_content_type = NotificationContentType(db_notification_task.content_type)
    else:
        db_notification_task.content_type = effective_content_type

    if effective_content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id
        )
        if update_notification_task_request.notification_title is None or update_notification_task_request.notification_content is None:
            raise schemas.error.CustomException(message="Notification title is required for custom notifications", code=400)
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
    elif effective_content_type == NotificationContentType.TEMPLATE:
        if update_notification_task_request.notification_template_id is None:
            raise schemas.error.CustomException(message="Notification template ID is required for template notifications", code=400)
        db_notification_template = crud.notification.get_notification_template_by_id(
            db=db,
            notification_template_id=update_notification_task_request.notification_template_id,
        )
        if db_notification_template is None:
            raise schemas.error.CustomException(message="Notification template not found", code=404)
        if crud.notification.get_user_notification_template_by_user_id_and_notification_template_id(
            db=db,
            user_id=user.id,
            notification_template_id=db_notification_template.id,
        ) is None:
            raise schemas.error.CustomException(message="You don't have permission to use this notification template", code=403)
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
            db=db,
            notification_task_id=update_notification_task_request.notification_task_id
        )
        if db_notification_task_content_template is None:
            crud.notification.create_notification_task_content_template(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id,
                notification_template_id=update_notification_task_request.notification_template_id,
                parameter_bindings_json=_serialize_notification_template_binding_map(
                    update_notification_task_request.notification_template_bindings
                ),
            )
        else:
            db_notification_task_content_template.notification_template_id = update_notification_task_request.notification_template_id
            db_notification_task_content_template.parameter_bindings_json = _serialize_notification_template_binding_map(
                update_notification_task_request.notification_template_bindings
            )

    if update_notification_task_request.notification_source_id is not None or update_notification_task_request.notification_target_id is not None:
        final_source_id = update_notification_task_request.notification_source_id or db_notification_task.notification_source_id
        final_target_id = update_notification_task_request.notification_target_id or db_notification_task.notification_target_id
        db_final_source = crud.notification.get_notification_source_by_id(db=db, notification_source_id=final_source_id)
        db_final_target = crud.notification.get_notification_target_by_id(db=db, notification_target_id=final_target_id)
        if db_final_source is not None and db_final_target is not None:
            db_source_provided = crud.notification.get_notification_source_provided_by_id(db=db, id=db_final_source.notification_source_provided_id)
            db_target_provided = crud.notification.get_notification_target_provided_by_id(db=db, id=db_final_target.notification_target_provided_id)
            if db_source_provided is not None and db_target_provided is not None:
                if db_source_provided.category != db_target_provided.category:
                    raise schemas.error.CustomException(
                        message=f"Source category '{db_source_provided.category}' does not match target category '{db_target_provided.category}'",
                        code=400
                    )
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
        elements.append(
            _build_notification_task_response(
                db=db,
                db_notification_task=db_notification_task,
            )
        )
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
