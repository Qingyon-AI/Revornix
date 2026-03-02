import json
import random
import string

from fastapi import APIRouter, Depends
from redis import Redis
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_cache, get_current_user, get_db
from common.encrypt import encrypt_notification_target_config
from common.logger import info_logger
from common.system_email.email import RevornixSystemEmail
from common.websocket import notificationManager
from enums.notification import NotificationTargetProvided, UserNotificationTargetRole

notification_target_manage_router = APIRouter()


async def _build_notification_target_config_json(
    *,
    target_provided_uuid: str,
    user_id: int,
    cache: Redis,
    email_target_form: schemas.notification.EmailTargetForm | None,
    ios_target_form: schemas.notification.IOSTargetForm | None,
    feishu_target_form: schemas.notification.FeiShuTargetForm | None,
    dingtalk_target_form: schemas.notification.DingTalkTargetForm | None,
    telegram_target_form: schemas.notification.TelegramTargetForm | None,
    require_config: bool,
) -> str | None:
    if target_provided_uuid == NotificationTargetProvided.EMAIL.meta.uuid:
        if email_target_form is None:
            if require_config:
                raise schemas.error.CustomException(message="email config should not be empty", code=400)
            return None
        target_email = email_target_form.email
        if not target_email:
            raise schemas.error.CustomException(message="email should not be empty", code=400)
        cached_code = await cache.get(
            name=f"{user_id}-user-notification-target-add-{target_email}",
        )
        if cached_code != email_target_form.code:
            raise schemas.error.CustomException(message="The code is incorrect", code=400)
        await cache.delete(
            f"{user_id}-user-notification-target-add-{target_email}",
        )
        return json.dumps(
            {
                "email": target_email,
            }
        )

    if target_provided_uuid in {
        NotificationTargetProvided.APPLE.meta.uuid,
        NotificationTargetProvided.APPLE_SANDBOX.meta.uuid,
    }:
        if ios_target_form is None:
            if require_config:
                raise schemas.error.CustomException(message="ios config should not be empty", code=400)
            return None
        if not ios_target_form.device_token:
            raise schemas.error.CustomException(message="device_token should not be empty", code=400)
        return json.dumps(
            {
                "device_token": ios_target_form.device_token,
            }
        )

    if target_provided_uuid == NotificationTargetProvided.FEISHU.meta.uuid:
        if feishu_target_form is None:
            if require_config:
                raise schemas.error.CustomException(message="feishu config should not be empty", code=400)
            return None
        if not feishu_target_form.webhook_url or not feishu_target_form.sign:
            raise schemas.error.CustomException(message="webhook_url or sign should not be empty", code=400)
        return json.dumps(
            {
                "webhook_url": feishu_target_form.webhook_url,
                "sign": feishu_target_form.sign,
            }
        )

    if target_provided_uuid == NotificationTargetProvided.DINGTALK.meta.uuid:
        if dingtalk_target_form is None:
            if require_config:
                raise schemas.error.CustomException(message="dingtalk config should not be empty", code=400)
            return None
        if not dingtalk_target_form.webhook_url or not dingtalk_target_form.sign:
            raise schemas.error.CustomException(message="webhook_url or sign should not be empty", code=400)
        return json.dumps(
            {
                "webhook_url": dingtalk_target_form.webhook_url,
                "sign": dingtalk_target_form.sign,
            }
        )

    if target_provided_uuid == NotificationTargetProvided.TELEGRAM.meta.uuid:
        if telegram_target_form is None:
            if require_config:
                raise schemas.error.CustomException(message="telegram config should not be empty", code=400)
            return None
        if not telegram_target_form.chat_id:
            raise schemas.error.CustomException(message="chat_id should not be empty", code=400)
        return json.dumps(
            {
                "chat_id": telegram_target_form.chat_id,
            }
        )

    return None


@notification_target_manage_router.post('/target/email/send', response_model=schemas.common.NormalResponse)
async def notification_email_target_send(
    email_target_send_code_request: schemas.notification.EmailTargetSendCodeRequest,
    user: models.user.User = Depends(get_current_user),
    cache: Redis = Depends(get_cache)
):
    target_email = email_target_send_code_request.email
    if not target_email:
        raise schemas.error.CustomException(message="email should not be empty", code=400)
    code = "".join(random.sample(string.ascii_letters + string.digits, 6))
    await cache.set(
        name=f'{user.id}-user-notification-target-add-{target_email}',
        value=code,
        ex=600
    )
    mail = RevornixSystemEmail()
    await mail.send(
        recipient=target_email,
        title="Revornix notification endpoint email binding.",
        content=f"Welcome to Revornix. Your verification code for binding the notification endpoint email is {code}. The code is valid for 10 minutes.",
        template='register.html'
    )
    return schemas.common.SuccessResponse(message="The code has been sent.")


@notification_target_manage_router.post('/target/ios/code/status', response_model=schemas.common.NormalResponse)
async def notification_ios_target_change_code_status(
    ios_target_change_code_status_request: schemas.notification.IOSTargetChangeCodeStatusRequest,
    user: models.user.User = Depends(get_current_user)
):
    code_uuid = ios_target_change_code_status_request.code_uuid
    status = ios_target_change_code_status_request.status
    data = {
        "code_uuid": code_uuid,
        "status": status
    }
    device_token = ios_target_change_code_status_request.device_token
    if device_token is not None:
        data.update({
            "device_token": device_token
        })
    data = json.dumps(data)
    delivered = await notificationManager.send_personal_message(data, f'web-{user.uuid}')
    if not delivered:
        info_logger.info(
            f"notification websocket offline, message cached. user_id={user.id}, websocket_id=web-{user.uuid}"
        )
    return schemas.common.SuccessResponse()


@notification_target_manage_router.post('/target/add', response_model=schemas.common.NormalResponse)
async def add_notification_target(
    add_notification_target_request: schemas.notification.AddNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
    cache: Redis = Depends(get_cache)
):
    db_notification_target_provided = crud.notification.get_notification_target_provided_by_id(
        db=db,
        id=add_notification_target_request.notification_target_provided_id
    )
    if db_notification_target_provided is None:
        raise schemas.error.CustomException(message="notification target provided not found", code=404)

    config_json = await _build_notification_target_config_json(
        target_provided_uuid=db_notification_target_provided.uuid,
        user_id=user.id,
        cache=cache,
        email_target_form=add_notification_target_request.email_target_form,
        ios_target_form=add_notification_target_request.ios_target_form,
        feishu_target_form=add_notification_target_request.feishu_target_form,
        dingtalk_target_form=add_notification_target_request.dingtalk_target_form,
        telegram_target_form=add_notification_target_request.telegram_target_form,
        require_config=True,
    )

    db_notification_target = crud.notification.create_notification_target(
        db=db,
        notification_target_provided_id=add_notification_target_request.notification_target_provided_id,
        title=add_notification_target_request.title,
        description=add_notification_target_request.description,
        creator_id=user.id,
        is_public=add_notification_target_request.is_public
    )

    if config_json is not None:
        db_notification_target.config_json = encrypt_notification_target_config(config_json)

    crud.notification.create_user_notification_target(
        db=db,
        notification_target_id=db_notification_target.id,
        user_id=user.id,
        role=UserNotificationTargetRole.CREATOR
    )
    db.commit()

    return schemas.common.SuccessResponse()


@notification_target_manage_router.post('/target/update', response_model=schemas.common.NormalResponse)
async def update_notification_target(
    update_notification_target_request: schemas.notification.UpdateNotificationTargetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
    cache: Redis = Depends(get_cache)
):
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=update_notification_target_request.notification_target_id
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="notification target not found", code=404)
    if db_notification_target.creator_id != user.id:
        raise schemas.error.CustomException(message="you don't have permission to update this notification target", code=403)

    if update_notification_target_request.title is not None:
        db_notification_target.title = update_notification_target_request.title
    if update_notification_target_request.description is not None:
        db_notification_target.description = update_notification_target_request.description
    if update_notification_target_request.is_public is not None:
        db_notification_target.is_public = update_notification_target_request.is_public

    config_json = await _build_notification_target_config_json(
        target_provided_uuid=db_notification_target.notification_target_provided.uuid,
        user_id=user.id,
        cache=cache,
        email_target_form=update_notification_target_request.email_target_form,
        ios_target_form=update_notification_target_request.ios_target_form,
        feishu_target_form=update_notification_target_request.feishu_target_form,
        dingtalk_target_form=update_notification_target_request.dingtalk_target_form,
        telegram_target_form=update_notification_target_request.telegram_target_form,
        require_config=False,
    )

    if config_json is not None:
        db_notification_target.config_json = encrypt_notification_target_config(config_json)

    db.commit()
    return schemas.common.SuccessResponse()
