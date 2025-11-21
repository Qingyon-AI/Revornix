import crud
import schemas
import models
from sqlalchemy.orm import Session
from fastapi import WebSocket, APIRouter, WebSocketDisconnect, Depends
from common.apscheduler.app import scheduler
from common.websocket import notificationManager
from apscheduler.triggers.cron import CronTrigger
from common.dependencies import get_current_user, get_db
from fastapi import status, WebSocketException
from datetime import datetime, timezone
from common.apscheduler.app import send_notification
from notification.template.daily_summary import DailySummaryNotificationTemplate
from enums.notification import NotificationContentType, NotificationTriggerType
from common.dependencies import decode_jwt_token

notification_router = APIRouter()
    
# 仅仅是前端用来接收消息的
@notification_router.websocket("/ws")
async def websocket_ask(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    # 从 query 参数获取 token
    token = websocket.query_params.get("access_token")
    if token is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    try:
        payload = decode_jwt_token(token=token)
        if payload is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
        uuid = payload.get("sub")
        if uuid is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    except Exception as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    user = crud.user.get_user_by_uuid(
        db=db, 
        user_uuid=uuid
    )
    if user is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    if user.is_forbidden:
         raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    websocket_id = user.uuid
    # 显式接受 WebSocket 连接
    await notificationManager.connect(
        id=websocket_id, 
        websocket=websocket
    )
    try:
        while True:
            data = await websocket.receive_text()
            print(f'接收到来自{websocket_id}的消息：', data)
    except WebSocketDisconnect:
        notificationManager.disconnect(websocket_id)
        await notificationManager.broadcast(f"Client #{websocket} left the chat")
    finally:
        db.close()
        
@notification_router.post('/template/all', response_model=schemas.notification.NotificationTemplatesResponse)
async def get_notification_templates(
    user: models.user.User = Depends(get_current_user)
):
    data = []
    daily_summary_template = DailySummaryNotificationTemplate()
    data.append(
        schemas.notification.NotificationTemplate(
            id=daily_summary_template.template_id,
            name=daily_summary_template.template_name,
            name_zh=daily_summary_template.template_name_zh,
            description=daily_summary_template.template_description,
            description_zh=daily_summary_template.template_description_zh
        )
    )
    res = schemas.notification.NotificationTemplatesResponse(data=data)
    return res

@notification_router.post('/trigger-event/all', response_model=schemas.notification.TriggerEventsResponse)
async def get_trigger_events(
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = []
    db_trigger_events = crud.notification.get_all_trigger_events(
        db=db
    )
    for db_trigger_event in db_trigger_events:
        data.append(
            schemas.notification.TriggerEvent.model_validate(db_trigger_event)
        )
    res = schemas.notification.TriggerEventsResponse(data=data)
    return res
        
@notification_router.post('/task/add', response_model=schemas.common.NormalResponse)
async def add_notification_task(
    add_notification_task_request: schemas.notification.AddNotificationTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_task = crud.notification.create_notification_task(
        db=db,
        user_id=user.id,
        title=add_notification_task_request.title,
        notification_content_type=add_notification_task_request.notification_content_type,
        user_notification_target_id=add_notification_task_request.user_notification_target_id,
        user_notification_source_id=add_notification_task_request.user_notification_source_id,
        trigger_type=add_notification_task_request.trigger_type,
        enable=add_notification_task_request.enable
    )
    if add_notification_task_request.notification_content_type == NotificationContentType.CUSTOM:
        if add_notification_task_request.notification_title is None or add_notification_task_request.notification_content is None:
            raise schemas.error.CustomException(message="The title of the notification is None", code=400)
        crud.notification.create_notification_task_content_custom(
            db=db,
            notification_task_id=db_notification_task.id,
            title=add_notification_task_request.notification_title,
            content=add_notification_task_request.notification_content
        )
    elif add_notification_task_request.notification_content_type == NotificationContentType.TEMPLATE:
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
        scheduler.add_job(
            func=send_notification,
            trigger=CronTrigger.from_crontab(add_notification_task_request.trigger_scheduler_cron),
            args=[
                db_notification_task.user_id,
                db_notification_task.id
            ],
            id=str(db_notification_task.id),
            next_run_time=datetime.now()
        )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/task/detail', response_model=schemas.notification.NotificationTask)
async def get_notification_task(
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
    if db_notification_task.user_id != user.id:
        raise schemas.error.CustomException(message="permission denied", code=403)
    
    res = schemas.notification.NotificationTask.model_validate(db_notification_task)
    
    if db_notification_task.notification_content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id
        )
        if db_notification_task_content_custom is not None:
            res.notification_title = db_notification_task_content_custom.title
            res.notification_content = db_notification_task_content_custom.content
    elif db_notification_task.notification_content_type == NotificationContentType.TEMPLATE:
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
            db=db,
            notification_task_id=db_notification_task.id
        )
        if db_notification_task_content_template is not None:
            res.notification_template_id = db_notification_task_content_template.notification_template_id

    db_user_notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
        db=db,
        user_notification_source_id=db_notification_task.user_notification_source_id
    )
    if db_user_notification_source is not None:
        res.user_notification_source = schemas.notification.UserNotificationSource.model_validate(db_user_notification_source)
    db_user_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
        db=db,
        user_notification_target_id=db_notification_task.user_notification_target_id
    )
    if db_user_notification_target is not None:
        res.user_notification_target = schemas.notification.UserNotificationTarget.model_validate(db_user_notification_target)
    
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

@notification_router.post('/task/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_task(
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
        job_exist = scheduler.get_job(str(notification_task_id))
        if job_exist is not None:
            scheduler.remove_job(str(notification_task_id))
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/task/update', response_model=schemas.common.NormalResponse)
async def update_notification_task(
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
    if db_notification_task.user_id != user.id:
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
        scheduler.remove_job(str(update_notification_task_request.notification_task_id))
    
    if update_notification_task_request.notification_content_type is not None:
        db_notification_task.notification_content_type = update_notification_task_request.notification_content_type
    
    if update_notification_task_request.notification_content_type == NotificationContentType.CUSTOM:
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
                content=update_notification_task_request.notification_content
            )
        else:
            db_notification_task_content_custom.title = update_notification_task_request.notification_title
            db_notification_task_content_custom.content = update_notification_task_request.notification_content
    elif update_notification_task_request.notification_content_type == NotificationContentType.TEMPLATE:
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

    if update_notification_task_request.user_notification_source_id is not None:
        db_notification_task.user_notification_source_id = update_notification_task_request.user_notification_source_id
    if update_notification_task_request.user_notification_target_id is not None:
        db_notification_task.user_notification_target_id = update_notification_task_request.user_notification_target_id
        
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
    
    exist_job = scheduler.get_job(str(db_notification_task.id))
    if exist_job is not None:
        scheduler.remove_job(str(db_notification_task.id))
    if db_notification_task.enable and db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        scheduler.add_job(
            func=send_notification,
            trigger=CronTrigger.from_crontab(db_notification_task.trigger_cron_expr),
            args=[
                db_notification_task.user_id,
                db_notification_task.id
            ],
            id=str(db_notification_task.id),
            next_run_time=datetime.now()
        )
        
    db_notification_task.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/task/mine', response_model=schemas.pagination.Pagination[schemas.notification.NotificationTask])
async def get_mine_notification_task(
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
        if task_data.notification_content_type == NotificationContentType.CUSTOM:
            db_notification_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                db=db,
                notification_task_id=task_data.id
            )
            if db_notification_content_custom is not None:
                task_data.notification_title = db_notification_content_custom.title
                task_data.notification_content = db_notification_content_custom.content
        elif task_data.notification_content_type == NotificationContentType.TEMPLATE:
            db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
                db=db,
                notification_task_id=task_data.id
            )
            if db_notification_task_content_template is not None:
                task_data.notification_template_id = db_notification_task_content_template.notification_template_id
        task_data.user_notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
            db=db,
            user_notification_source_id=db_notification_task.user_notification_source_id
        )
        task_data.user_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
            db=db,
            user_notification_target_id=db_notification_task.user_notification_target_id
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
    total_pages = count // get_mine_notification_task_request.page_size if count % get_mine_notification_task_request.page_size == 0 else count // get_mine_notification_task_request.page_size + 1
    res = schemas.pagination.Pagination(
        total_elements=count,
        total_pages=total_pages,
        page_num=get_mine_notification_task_request.page_num,
        page_size=get_mine_notification_task_request.page_size,
        current_page_elements=len(db_notification_tasks),
        elements=elements
    )
    return res

@notification_router.post('/target/add', response_model=schemas.common.NormalResponse)
async def add_notification_target(
    add_notification_target_request: schemas.notification.AddNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.create_user_notification_target(
        db=db,
        notification_target_id=add_notification_target_request.notification_target_id,
        title=add_notification_target_request.title,
        description=add_notification_target_request.description,
        creator_id=user.id,
        config_json=add_notification_target_request.config_json
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/task', response_model=schemas.notification.GetNotificationTargetRelatedTaskResponse)
async def get_notification_target_related_task(
    get_notification_target_related_task_request: schemas.notification.GetNotificationTargetRelatedTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_user_notification_targets = crud.notification.get_notification_task_by_user_notification_target_id(
        db=db,
        user_notification_target_id=get_notification_target_related_task_request.user_notification_target_id
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_target)
        for db_user_notification_target in db_user_notification_targets
    ]
    return schemas.notification.GetNotificationTargetRelatedTaskResponse(data=data)

@notification_router.post('/source/task', response_model=schemas.notification.GetNotificationSourceRelatedTaskResponse)
async def get_notification_source_related_task(
    get_notification_source_related_task_request: schemas.notification.GetNotificationSourceRelatedTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_user_notification_sources = crud.notification.get_notification_task_by_user_notification_source_id(
        db=db,
        user_notification_source_id=get_notification_source_related_task_request.user_notification_source_id
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_source)
        for db_user_notification_source in db_user_notification_sources
    ]
    return schemas.notification.GetNotificationTargetRelatedTaskResponse(data=data)
    

@notification_router.post('/target/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_target(
    delete_notification_target_request: schemas.notification.DeleteUserNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    for user_notification_target_id in delete_notification_target_request.user_notification_target_ids:
        db_user_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
            db=db,
            user_notification_target_id=user_notification_target_id
        )
        if db_user_notification_target is None:
            raise schemas.error.CustomException(message="notification target not found", code=404)
        if db_user_notification_target.creator_id != user.id:
            return schemas.error.CustomException(message="you don't have permission to delete this notification target", code=403)
        db_user_notification_target.delete_at = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/update', response_model=schemas.common.NormalResponse)
async def update_notification_target(
    update_notification_target_request: schemas.notification.UpdateNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
        db=db,
        user_notification_target_id=update_notification_target_request.user_notification_target_id
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)
    if db_notification_target.creator_id != user.id:
        return schemas.error.CustomException(message="you don't have permission to update this notification target", code=403)
    
    if update_notification_target_request.title is not None:
        db_notification_target.title = update_notification_target_request.title
    if update_notification_target_request.description is not None:
        db_notification_target.description = update_notification_target_request.description
    if update_notification_target_request.config_json is not None:
        db_notification_target.config_json = update_notification_target_request.config_json
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/mine', response_model=schemas.notification.UserNotificationTargetsResponse)
async def get_mine_notification_target(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_targets = crud.notification.get_user_notification_targets_by_creator_id(
        db=db,
        creator_id=user.id
    )
    notification_targets = [
        schemas.notification.UserNotificationTarget.model_validate(db_notification_target) for db_notification_target in db_notification_targets
    ]
    res = schemas.notification.UserNotificationTargetsResponse(data=notification_targets)
    return res

@notification_router.post("/target/detail", response_model=schemas.notification.UserNotificationTarget)
async def get_notification_target_detail(
    notification_target_detail_request: schemas.notification.UserNotificationTargetDetailRequest,
    db: Session = Depends(get_db)
):
    db_notification_target = crud.notification.get_user_notification_target_by_user_notification_target_id(
        db=db,
        user_notification_target_id=notification_target_detail_request.user_notification_target_id
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)
    res = schemas.notification.UserNotificationTarget.model_validate(db_notification_target)
    return res

@notification_router.post("/source/update", response_model=schemas.common.NormalResponse)
async def update_email_source(
    update_notification_source_request: schemas.notification.UpdateNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
        db=db,
        user_notification_source_id=update_notification_source_request.user_notification_source_id
    )
    if db_notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    
    if db_notification_source.creator_id != user.id:
        return schemas.error.CustomException(message="you don't have permission to update this notification source", code=403)
    
    if update_notification_source_request.title is not None:
        db_notification_source.title = update_notification_source_request.title
    if update_notification_source_request.description is not None:
        db_notification_source.description = update_notification_source_request.description
    if update_notification_source_request.config_json is not None:
        db_notification_source.config_json = update_notification_source_request.config_json
    
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/source/provided', response_model=schemas.notification.NotificationSourcesResponse)
async def get_provided_notification_source(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_sources = crud.notification.get_all_provided_notification_sources(
        db=db
    )
    notification_sources = [
        schemas.notification.NotificationSource.model_validate(db_notification_source) for db_notification_source in db_notification_sources
    ]
    res = schemas.notification.NotificationSourcesResponse(data=notification_sources)
    return res

@notification_router.post("/target/provided", response_model=schemas.notification.NotificationTargetsResponse)
async def get_provided_notification_target(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_targets = crud.notification.get_all_provided_notification_targets(
        db=db
    )
    notification_targets = [
        schemas.notification.NotificationTarget.model_validate(db_notification_target) for db_notification_target in db_notification_targets
    ]
    res = schemas.notification.NotificationTargetsResponse(data=notification_targets)
    return res

@notification_router.post("/source/mine", response_model=schemas.notification.UserNotificationSourcesResponse)
async def get_email_source(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_sources = crud.notification.get_user_notification_sources_by_creator_id(
        db=db,
        creator_id=user.id
    )
    notification_sources = [
        schemas.notification.UserNotificationSource.model_validate(notification_source) for notification_source in db_notification_sources
    ]
    return schemas.notification.UserNotificationSourcesResponse(data=notification_sources)

@notification_router.post("/source/detail", response_model=schemas.notification.UserNotificationSource)
async def get_notification_detail(
    notification_source_detail_request: schemas.notification.UserNotificationSourceDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
        db=db,
        user_notification_source_id=notification_source_detail_request.user_notification_source_id
    )
    if notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    if notification_source.creator_id != user.id:
        raise schemas.error.CustomException(message="you don't have permission to access this notification source", code=403)
    
    res = schemas.notification.UserNotificationSource.model_validate(notification_source)
    return res

@notification_router.post("/source/add", response_model=schemas.common.NormalResponse)
async def add_notification_source(
    add_notification_source_request: schemas.notification.AddNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.create_user_notification_source(
        db=db, 
        notification_source_id=add_notification_source_request.notification_source_id,
        creator_id=user.id, 
        title=add_notification_source_request.title,
        description=add_notification_source_request.description,
        config_json=add_notification_source_request.config_json
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post("/source/delete", response_model=schemas.common.NormalResponse)
async def delete_email_source(
    delete_email_source_request: schemas.notification.DeleteUserNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    for user_notification_source_id in delete_email_source_request.user_notification_source_ids:
        db_user_notification_source = crud.notification.get_user_notification_source_by_user_notification_source_id(
            db=db,
            user_notification_source_id=user_notification_source_id
        )
        if db_user_notification_source is None:
            raise schemas.error.CustomException(message="notification source not found", code=404)
        if db_user_notification_source.creator_id != user.id:
            raise schemas.error.CustomException(message="you don't have permission to delete this notification source", code=403)
        db_user_notification_source.delete_at = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/record/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord])
async def search_notification_record(
    search_notification_record_request: schemas.notification.SearchNotificationRecordRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_notification_record = None
    db_notification_records = crud.notification.search_notification_records_for_user(
        db=db, 
        user_id=user.id, 
        start=search_notification_record_request.start, 
        limit=search_notification_record_request.limit, 
        keyword=search_notification_record_request.keyword
    )
    if len(db_notification_records) == search_notification_record_request.limit:
        next_notification_record = crud.notification.search_next_notification_record_for_user(
            db=db, 
            user_id=user.id, 
            notification_record=db_notification_records[-1]
        )
        has_more = next_notification_record is not None
        next_start = next_notification_record.id if next_notification_record is not None else None
    if len(db_notification_records) < search_notification_record_request.limit or len(db_notification_records) == 0:
        has_more = False
    total = crud.notification.count_notification_records_for_user(
        db=db, 
        user_id=user.id, 
        keyword=search_notification_record_request.keyword
    )
    notification_records = [
        schemas.notification.NotificationRecord(
            id=db_notification_record.id,
            title=db_notification_record.title,
            content=db_notification_record.content,
            read_at=db_notification_record.read_at,
            create_time=db_notification_record.create_time,
            update_time=db_notification_record.update_time
        ) for db_notification_record in db_notification_records
    ]
    res = schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord](
        start=search_notification_record_request.start, 
        limit=search_notification_record_request.limit, 
        has_more=has_more, 
        elements=notification_records, 
        next_start=next_start,
        total=total
    )
    return res

@notification_router.post('/record/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_record(
    delete_notification_request: schemas.notification.DeleteNotificationRecordRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.delete_notification_records_by_notification_record_ids(
        db=db, 
        user_id=user.id, 
        notification_record_ids=delete_notification_request.notification_record_ids
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/record/detail', response_model=schemas.notification.NotificationRecord)
async def get_notification_record_detail(
    notification_detail_request: schemas.notification.NotificationRecordDetailRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_notification_record = crud.notification.get_notification_record_by_user_id_and_notification_record_id(
        db=db, 
        user_id=user.id, 
        notification_record_id=notification_detail_request.notification_record_id
    )
    if db_notification_record is None:
        raise schemas.error.CustomException(message="notification record not found", code=404)
    return schemas.notification.NotificationRecord.model_validate(db_notification_record)

@notification_router.post('/record/read-all', response_model=schemas.common.NormalResponse)
async def read_all_notification_record(
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.read_all_notification_records_for_user(
        db=db, 
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/record/read', response_model=schemas.common.NormalResponse)
async def read_notification_record(
    read_notification_request: schemas.notification.ReadNotificationRecordRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    if read_notification_request.status:
        crud.notification.read_notification_records_by_notification_record_ids_for_user(
            db=db, 
            user_id=user.id, 
            notification_record_ids=read_notification_request.notification_record_ids
        )
    else:
        crud.notification.unread_notification_records_by_notification_record_ids_for_user(
            db=db, 
            user_id=user.id, 
            notification_record_ids=read_notification_request.notification_record_ids
        )
    db.commit()
    return schemas.common.SuccessResponse()