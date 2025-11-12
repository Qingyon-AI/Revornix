import crud
import schemas
import models
from jose import jwt
from sqlalchemy.orm import Session
from fastapi import WebSocket, APIRouter, WebSocketDisconnect, Depends
from common.apscheduler.app import scheduler
from common.websocket import notificationManager
from apscheduler.triggers.cron import CronTrigger
from common.dependencies import get_current_user, get_db
from fastapi import status, WebSocketException
from datetime import datetime
from config.oauth2 import OAUTH_SECRET_KEY
from common.apscheduler.app import send_notification
from notification_template.daily_summary import DailySummaryNotificationTemplate
from enums.notification import NotificationContentType, NotificationSourceCategory, NotificationTargetCategory
from common.sql import SessionLocal

notification_router = APIRouter()
    
# 仅仅是前端用来接收消息的
@notification_router.websocket("/ws")
async def websocket_ask(websocket: WebSocket,
                        db: Session = Depends(get_db)):
    # 从 query 参数获取 token
    token = websocket.query_params.get("access_token")
    try:
        payload = jwt.decode(token, OAUTH_SECRET_KEY, algorithms=['HS256'])
        uuid: str = payload.get("sub")
        if uuid is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    except Exception as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    user = crud.user.get_user_by_uuid(db, user_uuid=uuid)
    if user is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    if user.is_forbidden:
         raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    websocket_id = user.uuid
    # 显式接受 WebSocket 连接
    await notificationManager.connect(id=websocket_id, 
                                      websocket=websocket)
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
async def get_notification_templates(user: models.user.User = Depends(get_current_user)):
    data = []
    daily_summary_template = DailySummaryNotificationTemplate()
    daily_summary_template.init_user(user_id=user.id)
    data.append(schemas.notification.NotificationTemplate(
        id=daily_summary_template.template_id,
        name=daily_summary_template.template_name,
        description=daily_summary_template.template_description,
        version=daily_summary_template.template_version,
        name_zh=daily_summary_template.template_name_zh,
        description_zh=daily_summary_template.template_description_zh
    ))
    res = schemas.notification.NotificationTemplatesResponse(data=data)
    return res
        
@notification_router.post('/task/add', response_model=schemas.common.NormalResponse)
async def add_notification_task(add_notification_task_request: schemas.notification.AddNotificationTaskRequest,
                                db: Session = Depends(get_db),
                                user: models.user.User = Depends(get_current_user)):
    db_notification_task = crud.notification.create_notification_task(db=db,
                                                                      user_id=user.id,
                                                                      notification_content_type=add_notification_task_request.notification_content_type,
                                                                      notification_target_id=add_notification_task_request.notification_target_id,
                                                                      notification_source_id=add_notification_task_request.notification_source_id,
                                                                      cron_expr=add_notification_task_request.cron_expr)
    if add_notification_task_request.notification_content_type == NotificationContentType.CUSTOM:
        crud.notification.create_notification_task_content_custom(
            db=db,
            notification_task_id=db_notification_task.id,
            title=add_notification_task_request.title,
            content=add_notification_task_request.content
        )
    elif add_notification_task_request.notification_content_type == NotificationContentType.TEMPLATE:
        crud.notification.create_notification_task_content_template(
            db=db,
            notification_task_id=db_notification_task.id,
            notification_template_id=add_notification_task_request.notification_template_id
        )
    if add_notification_task_request.enable and add_notification_task_request.cron_expr:
        scheduler.add_job(
            func=send_notification,
            trigger=CronTrigger.from_crontab(add_notification_task_request.cron_expr),
            args=[db_notification_task.user_id,
                  db_notification_task.id],
            id=str(db_notification_task.id),
            next_run_time=datetime.now()
        )
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/task/detail', response_model=schemas.notification.NotificationTask)
async def get_notification_task(get_notification_task_request: schemas.notification.NotificationTaskDetailRequest,
                                db: Session = Depends(get_db),
                                user: models.user.User = Depends(get_current_user)):
    db_notification_task = crud.notification.get_notification_task_by_notification_task_id(db=db,
                                                                                           notification_task_id=get_notification_task_request.notification_task_id)
    if db_notification_task is None:
        raise schemas.error.CustomException(message="notification task not found", code=404)
    if db_notification_task.user_id != user.id:
        raise schemas.error.CustomException(message="permission denied", code=403)
    
    res = schemas.notification.NotificationTask(
        id=db_notification_task.id,
        notification_content_type=db_notification_task.notification_content_type,
        notification_target_id=db_notification_task.notification_target_id,
        notification_source_id=db_notification_task.notification_source_id,
        cron_expr=db_notification_task.cron_expr,
        create_time=db_notification_task.create_time,
        update_time=db_notification_task.update_time,
        enable=db_notification_task.enable,
    )
    
    if db_notification_task.notification_content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(db=db,
                                                                                                                             notification_task_id=db_notification_task.id)
        if db_notification_task_content_custom is not None:
            res.title = db_notification_task_content_custom.title
            res.content = db_notification_task_content_custom.content
    elif db_notification_task.notification_content_type == NotificationContentType.TEMPLATE:
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(db=db,
                                                                                                                                 notification_task_id=db_notification_task.id)
        if db_notification_task_content_template is not None:
            res.notification_template_id = db_notification_task_content_template.notification_template_id

    db_notification_source = crud.notification.get_notification_source_by_notification_source_id(db=db,
                                                                                                 notification_source_id=db_notification_task.notification_source_id)
    db_notification_target = crud.notification.get_notification_target_by_notification_target_id(db=db,
                                                                                                 notification_target_id=db_notification_task.notification_target_id)
    res.notification_source = schemas.notification.NotificationSource(
        id=db_notification_source.id,
        title=db_notification_source.title,
        description=db_notification_source.description,
        create_time=db_notification_source.create_time,
        update_time=db_notification_source.update_time
    )
    res.notification_target = schemas.notification.NotificationTarget(
        id=db_notification_target.id,
        title=db_notification_target.title,
        description=db_notification_target.description,
        category=db_notification_target.category,
        create_time=db_notification_target.create_time,
        update_time=db_notification_target.update_time
    )
    return res

@notification_router.post('/task/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_task(delete_notification_task_request: schemas.notification.DeleteNotificationTaskRequest,
                                   db: Session = Depends(get_db),
                                   user: models.user.User = Depends(get_current_user)):
    crud.notification.delete_notification_tasks(db=db,
                                                user_id=user.id,
                                                notification_task_ids=delete_notification_task_request.notification_task_ids)
    for notification_task_id in delete_notification_task_request.notification_task_ids:
        crud.notification.delete_notification_task_content_custom_by_notification_task_id(db=db,
                                                                                          user_id=user.id,
                                                                                          notification_task_id=notification_task_id)
        crud.notification.delete_notification_task_content_template_by_notification_task_id(db=db,
                                                                                            user_id=user.id,
                                                                                            notification_task_id=notification_task_id)
        job_exist = scheduler.get_job(str(notification_task_id))
        if job_exist is not None:
            scheduler.remove_job(str(notification_task_id))
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/task/update', response_model=schemas.common.NormalResponse)
async def update_notification_task(update_notification_task_request: schemas.notification.UpdateNotificationTaskRequest,
                                   db: Session = Depends(get_db),
                                   user: models.user.User = Depends(get_current_user)):
    db_notification_task = crud.notification.get_notification_task_by_notification_task_id(db=db,
                                                                                           notification_task_id=update_notification_task_request.notification_task_id)
    if db_notification_task is None:
        return schemas.common.NormalResponse(message="notification task not found")
    if db_notification_task.user_id != user.id:
        return schemas.common.NormalResponse(message="permission denied")
    
    if update_notification_task_request.notification_content_type is not None:
        db_notification_task.notification_content_type = update_notification_task_request.notification_content_type
    
    if update_notification_task_request.notification_content_type == NotificationContentType.CUSTOM:
        db_notification_task_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(db=db,
                                                                                                                             notification_task_id=update_notification_task_request.notification_task_id)
        if db_notification_task_content_custom is None:
            crud.notification.create_notification_task_content_custom(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id,
                title=update_notification_task_request.title,
                content=update_notification_task_request.content
            )
        else:
            db_notification_task_content_custom.title = update_notification_task_request.title
            db_notification_task_content_custom.content = update_notification_task_request.content
    elif update_notification_task_request.notification_content_type == NotificationContentType.TEMPLATE:
        db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(db=db,
                                                                                                                                 notification_task_id=update_notification_task_request.notification_task_id)
        if db_notification_task_content_template is None:
            crud.notification.create_notification_task_content_template(
                db=db,
                notification_task_id=update_notification_task_request.notification_task_id,
                notification_template_id=update_notification_task_request.notification_template_id
            )
        else:
            db_notification_task_content_template.notification_template_id = update_notification_task_request.notification_template_id

    if update_notification_task_request.notification_target_id is not None:
        db_notification_task.notification_target_id = update_notification_task_request.notification_target_id
    if update_notification_task_request.notification_source_id is not None:
        db_notification_task.notification_source_id = update_notification_task_request.notification_source_id
    if update_notification_task_request.cron_expr is not None:
        db_notification_task.cron_expr = update_notification_task_request.cron_expr
    if update_notification_task_request.enable is not None:
        db_notification_task.enable = update_notification_task_request.enable
    
    exist_job = scheduler.get_job(str(db_notification_task.id))
    if exist_job is not None:
        scheduler.remove_job(str(db_notification_task.id))
    if db_notification_task.enable:
        scheduler.add_job(
            func=send_notification,
            trigger=CronTrigger.from_crontab(db_notification_task.cron_expr),
            args=[db_notification_task.user_id,
                  db_notification_task.id],
            id=str(db_notification_task.id),
            next_run_time=datetime.now()
        )
    
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/task/mine', response_model=schemas.notification.NotificationTaskResponse)
async def get_mine_notification_task(db: Session = Depends(get_db),
                                     user: models.user.User = Depends(get_current_user)):
    data = []
    # TODO 增加分页
    db_notification_tasks = crud.notification.get_notification_tasks_by_user_id(db=db,
                                                                                user_id=user.id)
    for db_notification_task in db_notification_tasks:
        task_data = schemas.notification.NotificationTask(id=db_notification_task.id,
                                                          cron_expr=db_notification_task.cron_expr,
                                                          enable=db_notification_task.enable,
                                                          notification_content_type=db_notification_task.notification_content_type,
                                                          notification_source_id=db_notification_task.notification_source_id,
                                                          notification_target_id=db_notification_task.notification_target_id,
                                                          create_time=db_notification_task.create_time,
                                                          update_time=db_notification_task.update_time)
        if task_data.notification_content_type == NotificationContentType.CUSTOM:
            db_notification_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(db=db,
                                                                                                                            notification_task_id=task_data.id)
            if db_notification_content_custom is not None:
                task_data.title = db_notification_content_custom.title
                task_data.content = db_notification_content_custom.content
        elif task_data.notification_content_type == NotificationContentType.TEMPLATE:
            db_notification_task_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(db=db,
                                                                                                                                     notification_task_id=task_data.id)
            if db_notification_task_content_template is not None:
                task_data.notification_template_id = db_notification_task_content_template.notification_template_id
        data.append(task_data)
    res = schemas.notification.NotificationTaskResponse(data=data)
    
    for db_notification_task in res.data:
        db_notification_task.notification_source = crud.notification.get_notification_source_by_notification_source_id(db=db,
                                                                                                                       notification_source_id=db_notification_task.notification_source_id)
        db_notification_task.notification_target = crud.notification.get_notification_target_by_notification_target_id(db=db,
                                                                                                                       notification_target_id=db_notification_task.notification_target_id)
    return res
        
@notification_router.post('/target/add', response_model=schemas.common.NormalResponse)
async def add_notification_target(add_notification_target_request: schemas.notification.AddNotificationTargetRequest,
                                  db: Session = Depends(get_db),
                                  user: models.user.User = Depends(get_current_user)):
    db_notification_target = crud.notification.create_notification_target(db=db,
                                                                          title=add_notification_target_request.title,
                                                                          description=add_notification_target_request.description,
                                                                          creator_id=user.id,
                                                                          category=add_notification_target_request.category)
    if add_notification_target_request.category == NotificationTargetCategory.EMAIL:
        db_email_notification_target = crud.notification.create_email_notification_target(db=db,
                                                                                          notification_target_id=db_notification_target.id,
                                                                                          email=add_notification_target_request.email)
    if add_notification_target_request.category == NotificationTargetCategory.IOS:
        db_ios_notification_target = crud.notification.create_ios_notification_target(db=db,
                                                                                      notification_target_id=db_notification_target.id,
                                                                                      device_token=add_notification_target_request.device_token)
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/target/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_target(delete_notification_target_request: schemas.notification.DeleteNotificationTargetRequest,
                                     db: Session = Depends(get_db),
                                     user: models.user.User = Depends(get_current_user)):
    crud.notification.delete_notification_targets_by_notification_target_ids(db=db,
                                                                             creator_id=user.id,
                                                                             notification_target_ids=delete_notification_target_request.notification_target_ids)
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/target/update', response_model=schemas.common.NormalResponse)
async def update_notification_target(update_notification_target_request: schemas.notification.UpdateNotificationTargetRequest,
                                     db: Session = Depends(get_db),
                                     user: models.user.User = Depends(get_current_user)):
    db_notification_target = crud.notification.get_notification_target_by_notification_target_id(db=db,
                                                                                                 notification_target_id=update_notification_target_request.notification_target_id)
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)
    if db_notification_target.creator_id != user.id:
        return schemas.error.CustomException(message="you don't have permission to update this notification target", code=403)
    
    if update_notification_target_request.title is not None:
        db_notification_target.title = update_notification_target_request.title
    if update_notification_target_request.description is not None:
        db_notification_target.description = update_notification_target_request.description
    
    if db_notification_target.category == NotificationTargetCategory.EMAIL:
        db_email_notification_target = crud.notification.get_email_notification_target_by_notification_target_id(db=db,
                                                                                                                 notification_target_id=update_notification_target_request.notification_target_id)
        if db_email_notification_target is None:
            raise schemas.error.CustomException(message="email notification target not found", code=404)
        if update_notification_target_request.email is not None:
            db_email_notification_target.email = update_notification_target_request.email
    
    if db_notification_target.category == NotificationTargetCategory.IOS:
        db_ios_notification_target = crud.notification.get_ios_notification_target_by_notification_target_id(db=db,
                                                                                                             notification_target_id=update_notification_target_request.notification_target_id)
        if db_ios_notification_target is None:
            raise schemas.error.CustomException(message="ios notification target not found", code=404)
        if update_notification_target_request.device_token is not None:
            db_ios_notification_target.device_token = update_notification_target_request.device_token
    db.commit()
    return schemas.common.NormalResponse(message="success")
        
@notification_router.post('/target/mine', response_model=schemas.notification.NotificationTargetsResponse)
async def get_mine_notification_target(db: Session = Depends(get_db),
                                       user: models.user.User = Depends(get_current_user)):
    # TODO 增加分野
    db_notification_targets = crud.notification.get_notification_targets_by_creator_id(db=db,
                                                                                       creator_id=user.id)
    res = schemas.notification.NotificationTargetsResponse(data=db_notification_targets)
    return res

@notification_router.post("/target/detail", response_model=schemas.notification.NotificationTargetDetail)
async def get_notification_target_detail(notification_target_detail_request: schemas.notification.NotificationTargetDetailRequest,
                                         db: Session = Depends(get_db)):
    db_notification_target = crud.notification.get_notification_target_by_notification_target_id(db=db,
                                                                                                 notification_target_id=notification_target_detail_request.notification_target_id)
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)
    res = schemas.notification.NotificationTargetDetail(id=db_notification_target.id,
                                                        category=db_notification_target.category,
                                                        title=db_notification_target.title,
                                                        description=db_notification_target.description)
    
    if db_notification_target.category == NotificationTargetCategory.EMAIL:
        db_email_notification_target = crud.notification.get_email_notification_target_by_notification_target_id(db=db,
                                                                                                                notification_target_id=db_notification_target.id)
        if db_email_notification_target is not None:
            res.email_notification_target = schemas.notification.EmailNotificationTarget(id=db_email_notification_target.id,
                                                                                        email=db_email_notification_target.email)
    if db_notification_target.category == NotificationTargetCategory.IOS:
        db_ios_notification_target = crud.notification.get_ios_notification_target_by_notification_target_id(db=db,
                                                                                                             notification_target_id=db_notification_target.id)
        if db_ios_notification_target is not None:
            res.ios_notification_target = schemas.notification.IOSNotificationTarget(id=db_ios_notification_target.id,
                                                                                     device_token=db_ios_notification_target.device_token)
    return res
        
@notification_router.post("/source/update", response_model=schemas.common.NormalResponse)
async def update_email_source(update_notification_source_request: schemas.notification.UpdateNotificationSourceRequest,
                              db: Session = Depends(get_db),
                              user: models.user.User = Depends(get_current_user)):
    db_notification_source = crud.notification.get_notification_source_by_notification_source_id(db=db,
                                                                                                 notification_source_id=update_notification_source_request.notification_source_id)
    if db_notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    
    if db_notification_source.creator_id != user.id:
        return schemas.error.CustomException(message="you don't have permission to update this notification source", code=403)
    
    if update_notification_source_request.title is not None:
        db_notification_source.title = update_notification_source_request.title
    if update_notification_source_request.description is not None:
        db_notification_source.description = update_notification_source_request.description
        
    if db_notification_source.category == NotificationSourceCategory.EMAIL:
        db_email_notification_source = crud.notification.get_email_notification_source_by_notification_source_id(db=db,
                                                                                                                 notification_source_id=update_notification_source_request.notification_source_id)
        if db_email_notification_source is None:
            raise schemas.error.CustomException(message="email notification source not found", code=404)
        if update_notification_source_request.email is not None:
            db_email_notification_source.email = update_notification_source_request.email
        if update_notification_source_request.password is not None:
            db_email_notification_source.password = update_notification_source_request.password
        if update_notification_source_request.server is not None:
            db_email_notification_source.server = update_notification_source_request.server
        if update_notification_source_request.port is not None:
            db_email_notification_source.port = update_notification_source_request.port
    
    if db_notification_source.category == NotificationSourceCategory.IOS:
        db_ios_notification_source = crud.notification.get_ios_notification_source_by_notification_source_id(db=db,
                                                                                                             notification_source_id=update_notification_source_request.notification_source_id)
        if db_ios_notification_source is None:
            raise schemas.error.CustomException(message="ios notification source not found", code=404)
        if update_notification_source_request.app_bundle_id is not None:
            db_ios_notification_source.app_bundle_id = update_notification_source_request.app_bundle_id
        if update_notification_source_request.team_id is not None:
            db_ios_notification_source.team_id = update_notification_source_request.team_id
        if update_notification_source_request.key_id is not None:
            db_ios_notification_source.key_id = update_notification_source_request.key_id
        if update_notification_source_request.private_key is not None:
            db_ios_notification_source.private_key = update_notification_source_request.private_key
        
    db.commit()
    
    return schemas.common.NormalResponse(message="success")
        
@notification_router.post("/source/mine", response_model=schemas.notification.NotificationSourcesResponse)
async def get_email_source(db: Session = Depends(get_db),
                           user: models.user.User = Depends(get_current_user)):
    # TODO 增加分野
    notification_sources = crud.notification.get_notification_sources_by_creator_id(db=db, creator_id=user.id)
    return schemas.notification.NotificationSourcesResponse(data=notification_sources)

@notification_router.post("/source/detail", response_model=schemas.notification.NotificationSourceDetail)
async def get_notification_detail(notification_source_detail_request: schemas.notification.NotificationSourceDetailRequest,
                                  db: Session = Depends(get_db),
                                  user: models.user.User = Depends(get_current_user)):
    notification_source = crud.notification.get_notification_source_by_notification_source_id(db=db,
                                                                                              notification_source_id=notification_source_detail_request.notification_source_id)
    if notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    if notification_source.creator_id != user.id:
        raise schemas.error.CustomException(message="you don't have permission to access this notification source", code=403)
    
    res = schemas.notification.NotificationSourceDetail(id=notification_source.id,
                                                        title=notification_source.title,
                                                        description=notification_source.description,
                                                        category=notification_source.category)
    
    if notification_source.category == NotificationSourceCategory.EMAIL:
        email_notification_source = crud.notification.get_email_notification_source_by_notification_source_id(db=db,
                                                                                                              notification_source_id=notification_source_detail_request.notification_source_id)
        if email_notification_source is None:
            raise schemas.error.CustomException(message="email notification source not found", code=404)
        
        res.email_notification_source = schemas.notification.EmailNotificationSource(id=email_notification_source.id,
                                                                                     email=email_notification_source.email,
                                                                                     password=email_notification_source.password,
                                                                                     server=email_notification_source.server,
                                                                                     port=email_notification_source.port)
        
    if notification_source.category == NotificationSourceCategory.IOS:
        ios_notification_source = crud.notification.get_ios_notification_source_by_notification_source_id(db=db,
                                                                                                          notification_source_id=notification_source_detail_request.notification_source_id)
        if ios_notification_source is None:
            raise schemas.error.CustomException(message="ios notification source not found", code=404)

        res.ios_notification_source = schemas.notification.IOSNotificationSource(id=ios_notification_source.id,
                                                                                 team_id=ios_notification_source.team_id,
                                                                                 key_id=ios_notification_source.key_id,
                                                                                 private_key=ios_notification_source.private_key,
                                                                                 app_bundle_id=ios_notification_source.app_bundle_id,)
        
    return res
        
@notification_router.post("/source/add", response_model=schemas.common.NormalResponse)
async def add_email_source(add_notification_source_request: schemas.notification.AddNotificationSourceRequest,
                           db: Session = Depends(get_db),
                           user: models.user.User = Depends(get_current_user)):
    db_notification_source = crud.notification.create_notification_source(db=db, 
                                                                          creator_id=user.id, 
                                                                          title=add_notification_source_request.title,
                                                                          description=add_notification_source_request.description,
                                                                          category=add_notification_source_request.category)
    if add_notification_source_request.category == NotificationSourceCategory.EMAIL:
        crud.notification.create_email_notification_source(
            db=db,
            notification_source_id=db_notification_source.id,
            email=add_notification_source_request.email,
            password=add_notification_source_request.password,
            server=add_notification_source_request.server,
            port=add_notification_source_request.port
        )
    if add_notification_source_request.category == NotificationSourceCategory.IOS:
        crud.notification.create_ios_notification_source(
            db=db,
            notification_source_id=db_notification_source.id, 
            team_id=add_notification_source_request.team_id,
            key_id=add_notification_source_request.key_id,
            private_key=add_notification_source_request.private_key,
            app_bundle_id=add_notification_source_request.app_bundle_id)
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post("/source/delete", response_model=schemas.common.NormalResponse)
async def delete_email_source(delete_email_source_request: schemas.notification.DeleteNotificationSourceRequest,
                              db: Session = Depends(get_db),
                              user: models.user.User = Depends(get_current_user)):
    crud.notification.delete_notification_sources_by_notification_source_ids(db=db, 
                                                                             creator_id=user.id,
                                                                             notification_source_ids=delete_email_source_request.notification_source_ids)
    crud.notification.delete_email_notification_sources_by_notification_source_ids(db=db,
                                                                                   creator_id=user.id,
                                                                                   notification_source_ids=delete_email_source_request.notification_source_ids)
    db.commit()
    return schemas.common.NormalResponse(message="success")
        
@notification_router.post('/record/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord])
async def search_notification_record(search_notification_record_request: schemas.notification.SearchNotificationRecordRequest, 
                                     db: Session = Depends(get_db), 
                                     user: models.user.User = Depends(get_current_user)):
    has_more = True
    next_start = None
    notification_records = crud.notification.search_notification_records_for_user(
        db=db, 
        user_id=user.id, 
        start=search_notification_record_request.start, 
        limit=search_notification_record_request.limit, 
        keyword=search_notification_record_request.keyword
    )
    if len(notification_records) == search_notification_record_request.limit:
        next_notification_record = crud.notification.search_next_notification_record_for_user(
            db=db, 
            user_id=user.id, 
            notification_record=notification_records[-1]
        )
        has_more = next_notification_record is not None
        next_start = next_notification_record.id if has_more else None
    if len(notification_records) < search_notification_record_request.limit or len(notification_records) == 0:
        has_more = False
    total = crud.notification.count_notification_records_for_user(
        db=db, 
        user_id=user.id, 
        keyword=search_notification_record_request.keyword
    )
    res = schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord](start=search_notification_record_request.start, 
                                                                                               limit=search_notification_record_request.limit, 
                                                                                               has_more=has_more, 
                                                                                               elements=notification_records, 
                                                                                               next_start=next_start,
                                                                                               total=total)
    return res

@notification_router.post('/record/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_record(delete_notification_request: schemas.notification.DeleteNotificationRecordRequest, 
                                     db: Session = Depends(get_db), 
                                     user: models.user.User = Depends(get_current_user)):
    crud.notification.delete_notification_records_by_notification_record_ids(db=db, 
                                                                             user_id=user.id, 
                                                                             notification_record_ids=delete_notification_request.notification_record_ids)
    db.commit()
    return schemas.common.SuccessResponse(message="success")
    
@notification_router.post('/record/detail', response_model=schemas.notification.NotificationRecord)
async def get_notification_record_detail(notification_detail_request: schemas.notification.NotificationRecordDetailRequest, 
                                         db: Session = Depends(get_db), 
                                         user: models.user.User = Depends(get_current_user)):
    db_notification_record = crud.notification.get_notification_record_by_user_id_and_notification_record_id(
        db=db, 
        user_id=user.id, 
        notification_record_id=notification_detail_request.notification_record_id
    )
    return schemas.notification.NotificationRecord(id=db_notification_record.id,
                                                   content=db_notification_record.content,
                                                   link=db_notification_record.link,
                                                   read_at=db_notification_record.read_at)

@notification_router.post('/record/read-all', response_model=schemas.common.NormalResponse)
async def read_all_notification_record(db: Session = Depends(get_db), 
                                       user: models.user.User = Depends(get_current_user)):
    crud.notification.read_all_notification_records_for_user(db=db, 
                                                     user_id=user.id)
    db.commit()
    return schemas.common.SuccessResponse(message="success")

@notification_router.post('/record/read', response_model=schemas.common.NormalResponse)
async def read_notification_record(read_notification_request: schemas.notification.ReadNotificationRecordRequest, 
                                   db: Session = Depends(get_db), 
                                   user: models.user.User = Depends(get_current_user)):
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
    return schemas.common.NormalResponse(message="success")