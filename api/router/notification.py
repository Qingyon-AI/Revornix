from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import (
    get_current_user,
    get_async_db,
    resolve_current_user_from_token,
)
from common.encrypt import decrypt_notification_source_config, decrypt_notification_target_config
from common.logger import exception_logger, format_log_message, info_logger
from common.websocket import notificationManager
from enums.notification import UserNotificationSourceRole, UserNotificationTargetRole
from router.notification_record_manage import notification_record_manage_router
from router.notification_source_manage import notification_source_manage_router
from router.notification_target_manage import notification_target_manage_router
from router.notification_task_manage import notification_task_manage_router

notification_router = APIRouter()
notification_router.include_router(notification_source_manage_router)
notification_router.include_router(notification_target_manage_router)
notification_router.include_router(notification_task_manage_router)
notification_router.include_router(notification_record_manage_router)


# 仅仅是前端用来接收消息的
@notification_router.websocket("/ws")
async def websocket_connect(
    websocket: WebSocket,
):
    # 从 query 参数获取 token
    token = websocket.query_params.get("access_token")
    from_plat = websocket.query_params.get("from_plat")
    if token is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    try:
        user = await resolve_current_user_from_token(
            request=websocket,
            token=token,
        )
    except Exception as e:
        exception_logger.warning(
            format_log_message("notification_websocket_token_decode_failed", error=e)
        )
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION) from e
    websocket_id = f'{from_plat}-{user.uuid}'
    # 显式接受 WebSocket 连接
    await notificationManager.connect(
        id=websocket_id,
        websocket=websocket
    )
    try:
        while True:
            data = await websocket.receive_text()
            info_logger.info(
                format_log_message(
                    "notification_websocket_message_received",
                    websocket_id=websocket_id,
                    payload=data,
                )
            )
    except WebSocketDisconnect:
        notificationManager.disconnect(websocket_id, websocket=websocket)
    except Exception as e:
        notificationManager.disconnect(websocket_id, websocket=websocket)
        exception_logger.error(
            format_log_message(
                "notification_websocket_failed",
                websocket_id=websocket_id,
                error=e,
            )
        )

@notification_router.post("/target/fork", response_model=schemas.common.NormalResponse)
async def fork_notification_target(
    notification_target_fork_request: schemas.notification.NotificationTargetForkRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_user_notification_target = await crud.notification.get_user_notification_target_by_user_id_and_notification_target_id_async(
        db=db,
        user_id=current_user.id,
        notification_target_id=notification_target_fork_request.notification_target_id,
        filter_role=UserNotificationTargetRole.FORKER,
    )
    if db_user_notification_target is not None:
        if notification_target_fork_request.status:
            raise schemas.error.CustomException(code=403, message="Notification target is already forked")
        db_user_notification_target.delete_at = now
        await db.commit()
        return schemas.common.SuccessResponse()

    if not notification_target_fork_request.status:
        raise schemas.error.CustomException(code=403, message="Notification target is not forked")

    await crud.notification.create_user_notification_target_async(
        db=db,
        user_id=current_user.id,
        notification_target_id=notification_target_fork_request.notification_target_id,
        role=UserNotificationTargetRole.FORKER,
    )
    await db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post('/target/usable', response_model=schemas.notification.NotificationTargetsUsableResponse)
async def get_usable_notification_target(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_targets = await crud.notification.get_usable_notification_targets_for_user_async(
        db=db,
        user_id=user.id,
    )
    notification_targets = [
        schemas.notification.NotificationTarget.model_validate(db_notification_target) for db_notification_target in db_notification_targets
    ]
    return schemas.notification.NotificationTargetsUsableResponse(data=notification_targets)

@notification_router.post('/source/community', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationSource])
async def get_notification_sources(
    notification_source_search_request: schemas.notification.SearchNotificationSourceRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    next_notification_source = None
    db_notification_sources = await crud.notification.search_notification_sources_for_user_async(
        db=db,
        user_id=user.id,
        keyword=notification_source_search_request.keyword,
        start=notification_source_search_request.start,
        limit=notification_source_search_request.limit,
    )
    if (
        notification_source_search_request.limit > 0
        and len(db_notification_sources) == notification_source_search_request.limit
    ):
        next_notification_source = await crud.notification.search_next_notification_source_for_user_async(
            db=db,
            user_id=user.id,
            notification_source=db_notification_sources[-1][0],
            keyword=notification_source_search_request.keyword,
        )
        has_more = next_notification_source is not None
        next_start = next_notification_source[0].id if next_notification_source is not None else None
    total = await crud.notification.count_all_notification_sources_for_user_async(
        db=db,
        user_id=user.id,
        keyword=notification_source_search_request.keyword,
    )

    async def get_notification_source_info(db_notification_source: models.notification.NotificationSource):
        db_notification_source_loaded = await crud.notification.get_notification_source_by_id_async(
            db=db,
            notification_source_id=db_notification_source.id
        )
        if db_notification_source_loaded is None:
            return None
        res = schemas.notification.NotificationSource.model_validate(db_notification_source)
        return schemas.notification.NotificationSource.model_validate(
            {
                **res.model_dump(),
                "is_forked": await crud.notification.get_user_notification_source_by_user_id_and_notification_source_id_async(
                    db=db,
                    user_id=user.id,
                    notification_source_id=db_notification_source.id,
                    filter_role=UserNotificationSourceRole.FORKER,
                ) is not None
            }
        )

    # Sequential because get_notification_source_info shares the AsyncSession.
    # AsyncSession is not safe for concurrent use; gathering would corrupt
    # session state. Real fix is N+1 -> one IN query in the CRUD layer.
    data = []
    for item in db_notification_sources:
        data.append(await get_notification_source_info(item[0]))
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=notification_source_search_request.start,
        limit=notification_source_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@notification_router.post("/source/detail", response_model=schemas.notification.NotificationSourceDetail)
async def get_notification_source_detail(
    notification_source_detail_request: schemas.notification.NotificationSourceDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source = await crud.notification.get_notification_source_by_id_async(
        db=db,
        notification_source_id=notification_source_detail_request.notification_source_id
    )
    if db_notification_source is None:
        raise schemas.error.CustomException(message="Notification source not found", code=404)
    db_notification_source_provided = await crud.notification.get_notification_source_provided_by_id_async(
        db=db,
        id=db_notification_source.notification_source_provided_id
    )
    if db_notification_source_provided is None:
        raise schemas.error.CustomException(message="Notification source provider not found", code=404)

    if db_notification_source.creator_id != user.id:
        if not db_notification_source.is_public:
            raise schemas.error.CustomException(code=403, message="You don't have permission to access this notification source")
        else:
            base = schemas.notification.NotificationSource.model_validate(db_notification_source, from_attributes=True)
            return schemas.notification.NotificationSource.model_validate(
                {
                    **base.model_dump(),
                    "is_forked": await crud.notification.get_user_notification_source_by_user_id_and_notification_source_id_async(
                        db=db,
                        user_id=user.id,
                        notification_source_id=notification_source_detail_request.notification_source_id,
                        filter_role=UserNotificationSourceRole.FORKER,
                    ) is not None,
                }
            )
    else:
        res = schemas.notification.NotificationSourceDetail.model_validate(db_notification_source, from_attributes=True)
        if res.config_json is not None:
            res.config_json = decrypt_notification_source_config(res.config_json)
        return res

@notification_router.post('/target/community', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationTarget])
async def get_notification_target(
    notification_target_search_request: schemas.notification.SearchNotificationTargetRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    next_notification_target = None
    db_notification_targets = await crud.notification.search_notification_targets_for_user_async(
        db=db,
        user_id=user.id,
        keyword=notification_target_search_request.keyword,
        start=notification_target_search_request.start,
        limit=notification_target_search_request.limit,
    )
    if (
        notification_target_search_request.limit > 0
        and len(db_notification_targets) == notification_target_search_request.limit
    ):
        next_notification_target = await crud.notification.search_next_notification_target_for_user_async(
            db=db,
            user_id=user.id,
            notification_target=db_notification_targets[-1][0],
            keyword=notification_target_search_request.keyword,
        )
        has_more = next_notification_target is not None
        next_start = next_notification_target[0].id if next_notification_target is not None else None
    total = await crud.notification.count_all_notification_targets_for_user_async(
        db=db,
        user_id=user.id,
        keyword=notification_target_search_request.keyword,
    )

    async def get_notification_target_info(db_notification_target: models.notification.NotificationTarget):
        db_notification_target_loaded = await crud.notification.get_notification_target_by_id_async(
            db=db,
            notification_target_id=db_notification_target.id
        )
        if db_notification_target_loaded is None:
            return None
        res = schemas.notification.NotificationTarget.model_validate(db_notification_target)
        return schemas.notification.NotificationTarget.model_validate(
            {
                **res.model_dump(),
                "is_forked": await crud.notification.get_user_notification_target_by_user_id_and_notification_target_id_async(
                    db=db,
                    user_id=user.id,
                    notification_target_id=db_notification_target.id,
                    filter_role=UserNotificationTargetRole.FORKER,
                ) is not None
            }
        )

    # Sequential: see comment in get_notification_sources above.
    data = []
    for item in db_notification_targets:
        data.append(await get_notification_target_info(item[0]))
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=notification_target_search_request.start,
        limit=notification_target_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@notification_router.post('/target/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_target(
    delete_notification_target_request: schemas.notification.DeleteNotificationTargetRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    for notification_target_id in delete_notification_target_request.notification_target_ids:
        db_notification_target = await crud.notification.get_notification_target_by_id_async(
            db=db,
            notification_target_id=notification_target_id,
        )
        if db_notification_target is None:
            raise schemas.error.CustomException(message="Notification target not found", code=404)
        if db_notification_target.creator_id != user.id:
            raise schemas.error.CustomException(message="You don't have permission to delete this notification target", code=403)
        db_notification_target.delete_at = now
        db_user_notification_target = await crud.notification.get_user_notification_target_by_user_id_and_notification_target_id_async(
            db=db,
            user_id=user.id,
            notification_target_id=notification_target_id,
            filter_role=UserNotificationTargetRole.CREATOR,
        )
        if db_user_notification_target is None:
            raise schemas.error.CustomException(message="User notification target record not found", code=404)
        if db_user_notification_target.user_id != user.id:
            raise schemas.error.CustomException(message="You don't have permission to delete this notification target", code=403)
        db_user_notification_target.delete_at = now
    await db.commit()
    return schemas.common.SuccessResponse()

@notification_router.post("/target/detail", response_model=schemas.notification.NotificationTargetDetail)
async def get_notification_target_detail(
    notification_target_detail_request: schemas.notification.NotificationTargetDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_target = await crud.notification.get_notification_target_by_id_async(
        db=db,
        notification_target_id=notification_target_detail_request.notification_target_id
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="Notification target not found", code=404)
    db_notification_target_provided = await crud.notification.get_notification_target_provided_by_id_async(
        db=db,
        id=db_notification_target.notification_target_provided_id
    )
    if db_notification_target_provided is None:
        raise schemas.error.CustomException(message="Notification target provider not found", code=404)

    if db_notification_target.creator_id != user.id:
        if not db_notification_target.is_public:
            raise schemas.error.CustomException(code=403, message="You don't have permission to access this notification target")
        else:
            base = schemas.notification.NotificationTarget.model_validate(db_notification_target, from_attributes=True)
            return schemas.notification.NotificationTarget.model_validate(
                {
                    **base.model_dump(),
                    "is_forked": await crud.notification.get_user_notification_target_by_user_id_and_notification_target_id_async(
                        db=db,
                        user_id=user.id,
                        notification_target_id=notification_target_detail_request.notification_target_id,
                        filter_role=UserNotificationTargetRole.FORKER,
                    ) is not None,
                }
            )
    else:
        res = schemas.notification.NotificationTargetDetail.model_validate(db_notification_target, from_attributes=True)
        if res.config_json is not None:
            res.config_json = decrypt_notification_target_config(res.config_json)
        return res

@notification_router.post("/target/provided", response_model=schemas.notification.NotificationTargetsProvidedResponse)
async def get_provided_notification_target(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_targets_provided = await crud.notification.get_all_notification_target_provideds_async(
        db=db,
    )
    notification_targets_provided = [
        schemas.notification.NotificationTargetProvided.model_validate(db_notification_target) for db_notification_target in db_notification_targets_provided
    ]
    return schemas.notification.NotificationTargetsProvidedResponse(data=notification_targets_provided)
