from datetime import datetime, timezone

from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.apscheduler.app import scheduler, send_notification_scheduler
from common.dependencies import decode_jwt_token, get_current_user, get_db
from common.logger import exception_logger, info_logger
from common.websocket import notificationManager
from enums.notification import NotificationContentType, NotificationTriggerType, UserNotificationSourceRole, UserNotificationTargetRole
from common.encrypt import encrypt_notification_source_config, encrypt_notification_target_config, decrypt_notification_source_config, decrypt_notification_target_config

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
        exception_logger.error(f"decode jwt token error for websocket connection: {e}")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION) from e
    user = crud.user.get_user_by_uuid(
        db=db,
        uuid=uuid
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
            info_logger.info(f'Received message from {websocket_id}: {data}')
    except WebSocketDisconnect:
        notificationManager.disconnect(websocket_id)
        await notificationManager.broadcast(f"Client #{websocket} left the chat")
    finally:
        db.close()

@notification_router.post("/source/add", response_model=schemas.common.NormalResponse)
def add_notification_source(
    add_notification_source_request: schemas.notification.AddNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source = crud.notification.create_notification_source(
        db=db,
        notification_source_provided_id=add_notification_source_request.notification_source_provided_id,
        creator_id=user.id,
        title=add_notification_source_request.title,
        description=add_notification_source_request.description,
        is_public=add_notification_source_request.is_public
    )
    if add_notification_source_request.config_json is not None:
        db_notification_source.config_json = encrypt_notification_source_config(add_notification_source_request.config_json)
    crud.notification.create_user_notification_source(
        db=db,
        user_id=user.id,
        notification_source_id=db_notification_source.id,
        role=UserNotificationSourceRole.CREATOR
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post("/source/update", response_model=schemas.common.NormalResponse)
def update_notification_source(
    update_notification_source_request: schemas.notification.UpdateNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source = crud.notification.get_notification_source_by_id(
        db=db,
        notification_source_id=update_notification_source_request.notification_source_id
    )
    if db_notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)

    if db_notification_source.creator_id != user.id:
        return schemas.error.CustomException(message="You don't have permission to update this notification source", code=403)

    if update_notification_source_request.title is not None:
        db_notification_source.title = update_notification_source_request.title
    if update_notification_source_request.description is not None:
        db_notification_source.description = update_notification_source_request.description
    if update_notification_source_request.config_json is not None:
        db_notification_source.config_json = encrypt_notification_source_config(update_notification_source_request.config_json)
    if update_notification_source_request.is_public is not None:
        db_notification_source.is_public = update_notification_source_request.is_public

    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/source/provided', response_model=schemas.notification.NotificationSourcesProvidedResponse)
def get_provided_notification_source(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_sources_provided = crud.notification.get_all_provided_notification_sources(
        db=db
    )
    notification_sources_provided = [
        schemas.notification.NotificationSourceProvided.model_validate(db_notification_source) for db_notification_source in db_notification_sources_provided
    ]
    return schemas.notification.NotificationSourcesProvidedResponse(data=notification_sources_provided)

@notification_router.post("/source/fork", response_model=schemas.common.NormalResponse)
def fork_notification_source(
    notification_source_fork_request: schemas.notification.NotificationSourceForkRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_user_notification_source = crud.notification.get_user_notification_source_by_user_id_and_notification_source_id(
        db=db,
        user_id=current_user.id,
        notification_source_id=notification_source_fork_request.notification_source_id,
        filter_role=UserNotificationSourceRole.FORKER
    )

    if db_user_notification_source is not None:
        if notification_source_fork_request.status:
            raise schemas.error.CustomException(code=403, message="You have forked this notification source")
        else:
            db_user_notification_source.delete_at = now
            db.commit()
            return schemas.common.SuccessResponse()
    else:
        if notification_source_fork_request.status:
            crud.notification.create_user_notification_source(
                db=db,
                user_id=current_user.id,
                notification_source_id=notification_source_fork_request.notification_source_id,
                role=UserNotificationSourceRole.FORKER,
            )
        else:
            raise schemas.error.CustomException(code=403, message="You have not forked this notification source")

    db.commit()

    return schemas.common.SuccessResponse()

@notification_router.post("/target/fork", response_model=schemas.common.NormalResponse)
def fork_notification_target(
    notification_target_fork_request: schemas.notification.NotificationTargetForkRequest,
    db: Session = Depends(get_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_user_notification_target = crud.notification.get_user_notification_target_by_user_id_and_notification_target_id(
        db=db,
        user_id=current_user.id,
        notification_target_id=notification_target_fork_request.notification_target_id,
        filter_role=UserNotificationTargetRole.FORKER
    )

    if db_user_notification_target is not None:
        if notification_target_fork_request.status:
            raise schemas.error.CustomException(code=403, message="You have forked this notification target")
        else:
            db_user_notification_target.delete_at = now
            db.commit()
            return schemas.common.SuccessResponse()
    else:
        if notification_target_fork_request.status:
            crud.notification.create_user_notification_target(
                db=db,
                user_id=current_user.id,
                notification_target_id=notification_target_fork_request.notification_target_id,
                role=UserNotificationTargetRole.FORKER,
            )
        else:
            raise schemas.error.CustomException(code=403, message="You have not forked this notification target")

    db.commit()

    return schemas.common.SuccessResponse()

@notification_router.post('/source/usable', response_model=schemas.notification.NotificationSourcesUsableResponse)
async def get_usable_notification_source(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_sources = crud.notification.get_usable_notification_sources_for_user(
        db=db,
        user_id=user.id
    )
    notification_sources = [
        schemas.notification.NotificationSource.model_validate(db_notification_source) for db_notification_source in db_notification_sources
    ]
    return schemas.notification.NotificationSourcesUsableResponse(data=notification_sources)

@notification_router.post('/target/usable', response_model=schemas.notification.NotificationTargetsUsableResponse)
async def get_usable_notification_target(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_targets = crud.notification.get_usable_notification_targets_for_user(
        db=db,
        user_id=user.id
    )
    notification_targets = [
        schemas.notification.NotificationTarget.model_validate(db_notification_target) for db_notification_target in db_notification_targets
    ]
    return schemas.notification.NotificationTargetsUsableResponse(data=notification_targets)

@notification_router.post('/source/community', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationSource])
def get_notification_sources(
    notification_source_search_request: schemas.notification.SearchNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_notification_source = None
    db_notification_sources = crud.notification.search_notification_sources_for_user(
        db=db,
        user_id=user.id,
        keyword=notification_source_search_request.keyword,
    )
    if len(db_notification_sources) < notification_source_search_request.limit or len(db_notification_sources) == 0:
        has_more = False
    if len(db_notification_sources) == notification_source_search_request.limit:
        next_notification_source = crud.notification.search_next_notification_source_for_user(
            db=db,
            user_id=user.id,
            notification_source=db_notification_sources[-1][0],
            keyword=notification_source_search_request.keyword
        )
        has_more = next_notification_source is not None
        next_start = next_notification_source.id if next_notification_source is not None else None
    total = crud.notification.count_all_notification_sources_for_user(
        db=db,
        user_id=user.id,
        keyword=notification_source_search_request.keyword
    )
    next_start = next_notification_source.id if next_notification_source is not None else None

    def get_notification_source_info(db_notification_source: models.notification.NotificationSource):
        db_notification_source_provided = crud.notification.get_notification_source_by_id(
            db=db,
            notification_source_id=db_notification_source.id
        )
        if db_notification_source_provided is None:
            return None
        res = schemas.notification.NotificationSource.model_validate(db_notification_source)
        return schemas.notification.NotificationSource.model_validate(
            {
                **res.model_dump(),
                "is_forked": crud.notification.get_user_notification_source_by_user_id_and_notification_source_id(
                    db=db,
                    user_id=user.id,
                    notification_source_id=db_notification_source.id,
                    filter_role=UserNotificationSourceRole.FORKER
                ) is not None
            }
        )
        
    data = [
        get_notification_source_info(item[0])
        for item in db_notification_sources
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=notification_source_search_request.start,
        limit=notification_source_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@notification_router.post("/source/detail", response_model=schemas.notification.NotificationSourceDetail)
def get_notification_source_detail(
    notification_source_detail_request: schemas.notification.NotificationSourceDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source = crud.notification.get_notification_source_by_id(
        db=db,
        notification_source_id=notification_source_detail_request.notification_source_id
    )
    if db_notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    db_notification_source_provided = crud.notification.get_notification_source_provided_by_id(
        db=db,
        id=db_notification_source.notification_source_provided_id
    )
    if db_notification_source_provided is None:
        raise schemas.error.CustomException(message="This notification source is not provided", code=404)

    if db_notification_source.creator_id != user.id:
        if not db_notification_source.is_public:
            raise schemas.error.CustomException(code=403, message="You don't have permission to access this notification source")
        else:
            base = schemas.notification.NotificationSource.model_validate(db_notification_source, from_attributes=True)
            return schemas.notification.NotificationSource.model_validate(
                {
                    **base.model_dump(),
                    "is_forked": crud.notification.get_user_notification_source_by_user_id_and_notification_source_id(
                        db=db,
                        user_id=user.id,
                        notification_source_id=notification_source_detail_request.notification_source_id,
                        filter_role=UserNotificationSourceRole.FORKER
                    ) is not None,
                }
            )
    else:
        res = schemas.notification.NotificationSourceDetail.model_validate(db_notification_source, from_attributes=True)
        if res.config_json is not None:
            res.config_json = decrypt_notification_source_config(res.config_json)
        return res

@notification_router.post("/source/delete", response_model=schemas.common.NormalResponse)
def delete_notification_source(
    delete_notification_source_request: schemas.notification.DeleteNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    for notification_source_id in delete_notification_source_request.notification_source_ids:
        db_notification_source = crud.notification.get_notification_source_by_id(
            db=db,
            notification_source_id=notification_source_id
        )
        if db_notification_source is None:
            raise schemas.error.CustomException(message="notification source not found", code=404)
        if db_notification_source.creator_id != user.id:
            raise schemas.error.CustomException(message="you don't have permission to delete this notification source", code=403)
        db_notification_source.delete_at = now
        db_user_notification_source = crud.notification.get_user_notification_source_by_user_id_and_notification_source_id(
            db=db,
            user_id=user.id,
            notification_source_id=notification_source_id,
            filter_role=UserNotificationSourceRole.CREATOR
        )
        if db_user_notification_source is None:
            raise schemas.error.CustomException(message="the user notification source not found", code=404)
        if db_user_notification_source.user_id != user.id:
            raise schemas.error.CustomException(message="you don't have permission to delete this notification source", code=403)
        db_user_notification_source.delete_at = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/add', response_model=schemas.common.NormalResponse)
def add_notification_target(
    add_notification_target_request: schemas.notification.AddNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_target = crud.notification.create_notification_target(
        db=db,
        notification_target_provided_id=add_notification_target_request.notification_target_provided_id,
        title=add_notification_target_request.title,
        description=add_notification_target_request.description,
        creator_id=user.id,
        is_public=add_notification_target_request.is_public
    )
    if add_notification_target_request.config_json is not None:
        db_notification_target.config_json = encrypt_notification_target_config(add_notification_target_request.config_json)
    crud.notification.create_user_notification_target(
        db=db,
        notification_target_id=db_notification_target.id,
        user_id=user.id,
        role=UserNotificationTargetRole.CREATOR
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/update', response_model=schemas.common.NormalResponse)
def update_notification_target(
    update_notification_target_request: schemas.notification.UpdateNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=update_notification_target_request.notification_target_id
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
        db_notification_target.config_json = encrypt_notification_target_config(update_notification_target_request.config_json)
    if update_notification_target_request.is_public is not None:
        db_notification_target.is_public = update_notification_target_request.is_public
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/community', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationTarget])
def get_notification_target(
    notification_target_search_request: schemas.notification.SearchNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_notification_target = None
    db_notification_targets = crud.notification.search_notification_targets_for_user(
        db=db,
        user_id=user.id,
        keyword=notification_target_search_request.keyword,
    )
    if len(db_notification_targets) < notification_target_search_request.limit or len(db_notification_targets) == 0:
        has_more = False
    if len(db_notification_targets) == notification_target_search_request.limit:
        next_notification_target = crud.notification.search_next_notification_target_for_user(
            db=db,
            user_id=user.id,
            notification_target=db_notification_targets[-1][0],
            keyword=notification_target_search_request.keyword
        )
        has_more = next_notification_target is not None
        next_start = next_notification_target.id if next_notification_target is not None else None
    total = crud.notification.count_all_notification_targets_for_user(
        db=db,
        user_id=user.id,
        keyword=notification_target_search_request.keyword
    )
    next_start = next_notification_target.id if next_notification_target is not None else None

    def get_notification_target_info(db_notification_target: models.notification.NotificationTarget):
        db_notification_target_provided = crud.notification.get_notification_target_by_id(
            db=db,
            notification_target_id=db_notification_target.id
        )
        if db_notification_target_provided is None:
            return None
        res = schemas.notification.NotificationTarget.model_validate(db_notification_target)
        return schemas.notification.NotificationTarget.model_validate(
            {
                **res.model_dump(),
                "is_forked": crud.notification.get_user_notification_target_by_user_id_and_notification_target_id(
                    db=db,
                    user_id=user.id,
                    notification_target_id=db_notification_target.id,
                    filter_role=UserNotificationTargetRole.FORKER
                ) is not None
            }
        )
        
    data = [
        get_notification_target_info(item[0])
        for item in db_notification_targets
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=notification_target_search_request.start,
        limit=notification_target_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@notification_router.post('/target/delete', response_model=schemas.common.NormalResponse)
def delete_notification_target(
    delete_notification_target_request: schemas.notification.DeleteNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    for notification_target_id in delete_notification_target_request.notification_target_ids:
        db_notification_target = crud.notification.get_notification_target_by_id(
            db=db,
            notification_target_id=notification_target_id
        )
        if db_notification_target is None:
            raise schemas.error.CustomException(message="notification target not found", code=404)
        if db_notification_target.creator_id != user.id:
            raise schemas.error.CustomException(message="you don't have permission to delete this notification target", code=403)
        db_notification_target.delete_at = now
        db_user_notification_target = crud.notification.get_user_notification_target_by_user_id_and_notification_target_id(
            db=db,
            user_id=user.id,
            notification_target_id=notification_target_id,
            filter_role=UserNotificationTargetRole.CREATOR
        )
        if db_user_notification_target is None:
            raise schemas.error.CustomException(message="The user notification target not found", code=404)
        if db_user_notification_target.user_id != user.id:
            return schemas.error.CustomException(message="you don't have permission to delete this notification target", code=403)
        db_user_notification_target.delete_at = now
    db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post("/target/detail", response_model=schemas.notification.NotificationTargetDetail)
def get_notification_target_detail(
    notification_target_detail_request: schemas.notification.NotificationTargetDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=notification_target_detail_request.notification_target_id
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)
    db_notification_target_provided = crud.notification.get_notification_target_provided_by_id(
        db=db,
        id=db_notification_target.notification_target_provided_id
    )
    if db_notification_target_provided is None:
        raise schemas.error.CustomException(message="This notification target is not provided", code=404)

    if db_notification_target.creator_id != user.id:
        if not db_notification_target.is_public:
            raise schemas.error.CustomException(code=403, message="You don't have permission to access this notification target")
        else:
            base = schemas.notification.NotificationTarget.model_validate(db_notification_target, from_attributes=True)
            return schemas.notification.NotificationTarget.model_validate(
                {
                    **base.model_dump(),
                    "is_forked": crud.notification.get_user_notification_target_by_user_id_and_notification_target_id(
                        db=db,
                        user_id=user.id,
                        notification_target_id=notification_target_detail_request.notification_target_id,
                        filter_role=UserNotificationTargetRole.FORKER
                    ) is not None,
                }
            )
    else:
        res = schemas.notification.NotificationTargetDetail.model_validate(db_notification_target, from_attributes=True)
        if res.config_json is not None:
            res.config_json = decrypt_notification_target_config(res.config_json)
        return res

@notification_router.post("/target/provided", response_model=schemas.notification.NotificationTargetsProvidedResponse)
def get_provided_notification_target(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_targets_provided = crud.notification.get_all_notification_target_provideds(
        db=db
    )
    notification_targets_provided = [
        schemas.notification.NotificationTargetProvided.model_validate(db_notification_target) for db_notification_target in db_notification_targets_provided
    ]
    return schemas.notification.NotificationTargetsProvidedResponse(data=notification_targets_provided)

@notification_router.post('/template/all', response_model=schemas.notification.NotificationTemplatesResponse)
def get_notification_templates(
    user: models.user.User = Depends(get_current_user),
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

@notification_router.post('/trigger-event/all', response_model=schemas.notification.TriggerEventsResponse)
def get_trigger_events(
    user: models.user.User = Depends(get_current_user),
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

@notification_router.post('/task/add', response_model=schemas.common.NormalResponse)
def add_notification_task(
    add_notification_task_request: schemas.notification.AddNotificationTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_task = crud.notification.create_notification_task(
        db=db,
        user_id=user.id,
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
        scheduler.add_job(
            func=send_notification_scheduler,
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
    if db_notification_task.user_id != user.id:
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

@notification_router.post('/task/delete', response_model=schemas.common.NormalResponse)
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
        job_exist = scheduler.get_job(str(notification_task_id))
        if job_exist is not None:
            scheduler.remove_job(str(notification_task_id))
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post('/task/update', response_model=schemas.common.NormalResponse)
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

    exist_job = scheduler.get_job(str(db_notification_task.id))
    if exist_job is not None:
        scheduler.remove_job(str(db_notification_task.id))
    if db_notification_task.enable and db_notification_task.trigger_type == NotificationTriggerType.SCHEDULER:
        scheduler.add_job(
            func=send_notification_scheduler,
            trigger=CronTrigger.from_crontab(update_notification_task_request.trigger_scheduler_cron),
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
    total_pages = count // get_mine_notification_task_request.page_size if count % get_mine_notification_task_request.page_size == 0 else count // get_mine_notification_task_request.page_size + 1
    return schemas.pagination.Pagination(
        total_elements=count,
        total_pages=total_pages,
        page_num=get_mine_notification_task_request.page_num,
        page_size=get_mine_notification_task_request.page_size,
        current_page_elements=len(db_notification_tasks),
        elements=elements
    )

@notification_router.post('/target/task', response_model=schemas.notification.GetNotificationTargetRelatedTaskResponse)
def get_notification_target_related_task(
    get_notification_target_related_task_request: schemas.notification.GetNotificationTargetRelatedTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
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

@notification_router.post('/source/task', response_model=schemas.notification.GetNotificationSourceRelatedTaskResponse)
def get_notification_source_related_task(
    get_notification_source_related_task_request: schemas.notification.GetNotificationSourceRelatedTaskRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_user_notification_sources = crud.notification.get_notification_task_by_notification_source_id(
        db=db,
        notification_source_id=get_notification_source_related_task_request.notification_source_id
    )
    data = [
        schemas.notification.NotificationTaskBaseInfo.model_validate(db_user_notification_source)
        for db_user_notification_source in db_user_notification_sources
    ]
    return schemas.notification.GetNotificationTargetRelatedTaskResponse(data=data)

@notification_router.post('/record/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord])
def search_notification_record(
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
        schemas.notification.NotificationRecord.model_validate(db_notification_record)
        for db_notification_record in db_notification_records
    ]
    return schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord](
        start=search_notification_record_request.start,
        limit=search_notification_record_request.limit,
        has_more=has_more,
        elements=notification_records,
        next_start=next_start,
        total=total
    )

@notification_router.post('/record/delete', response_model=schemas.common.NormalResponse)
def delete_notification_record(
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
def get_notification_record_detail(
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
def read_all_notification_record(
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
def read_notification_record(
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
