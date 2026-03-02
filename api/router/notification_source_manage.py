import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from common.encrypt import encrypt_notification_source_config
from enums.notification import NotificationSourceProvided, UserNotificationSourceRole

notification_source_manage_router = APIRouter()


def _build_notification_source_config_json(
    *,
    source_provided_uuid: str,
    email_source_form: schemas.notification.EmailSourceForm | None,
    ios_source_form: schemas.notification.IOSSourceForm | None,
    feishu_source_form: schemas.notification.FeiShuSourceForm | None,
    telegram_source_form: schemas.notification.TelegramSourceForm | None,
    require_config: bool,
) -> str | None:
    if source_provided_uuid == NotificationSourceProvided.EMAIL.meta.uuid:
        if email_source_form is None:
            if require_config:
                raise schemas.error.CustomException(message="email config should not be empty", code=400)
            return None
        return json.dumps(
            {
                "host": email_source_form.host,
                "port": email_source_form.port,
                "username": email_source_form.username,
                "password": email_source_form.password,
            }
        )

    if source_provided_uuid in {
        NotificationSourceProvided.APPLE.meta.uuid,
        NotificationSourceProvided.APPLE_SANDBOX.meta.uuid,
    }:
        if ios_source_form is None:
            if require_config:
                raise schemas.error.CustomException(message="ios config should not be empty", code=400)
            return None
        return json.dumps(
            {
                "team_id": ios_source_form.team_id,
                "key_id": ios_source_form.key_id,
                "private_key": ios_source_form.private_key,
                "apns_topic": ios_source_form.apns_topic,
            }
        )

    if source_provided_uuid == NotificationSourceProvided.FEISHU.meta.uuid:
        if feishu_source_form is None:
            if require_config:
                raise schemas.error.CustomException(message="feishu config should not be empty", code=400)
            return None
        return json.dumps(
            {
                "app_id": feishu_source_form.app_id,
                "app_secret": feishu_source_form.app_secret,
            }
        )

    if source_provided_uuid == NotificationSourceProvided.DINGTALK.meta.uuid:
        return None

    if source_provided_uuid == NotificationSourceProvided.TELEGRAM.meta.uuid:
        if telegram_source_form is None:
            if require_config:
                raise schemas.error.CustomException(message="telegram config should not be empty", code=400)
            return None
        return json.dumps(
            {
                "bot_token": telegram_source_form.bot_token,
            }
        )

    return None


@notification_source_manage_router.post("/source/add", response_model=schemas.common.NormalResponse)
def add_notification_source(
    add_notification_source_request: schemas.notification.AddNotificationSourceRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_source_provided = crud.notification.get_notification_source_provided_by_id(
        db=db,
        id=add_notification_source_request.notification_source_provided_id
    )
    if db_notification_source_provided is None:
        raise schemas.error.CustomException(message="notification source provided not found", code=404)

    config_json = _build_notification_source_config_json(
        source_provided_uuid=db_notification_source_provided.uuid,
        email_source_form=add_notification_source_request.email_source_form,
        ios_source_form=add_notification_source_request.ios_source_form,
        feishu_source_form=add_notification_source_request.feishu_source_form,
        telegram_source_form=add_notification_source_request.telegram_source_form,
        require_config=True,
    )

    db_notification_source = crud.notification.create_notification_source(
        db=db,
        notification_source_provided_id=add_notification_source_request.notification_source_provided_id,
        creator_id=user.id,
        title=add_notification_source_request.title,
        description=add_notification_source_request.description,
        is_public=add_notification_source_request.is_public
    )

    if config_json is not None:
        db_notification_source.config_json = encrypt_notification_source_config(config_json)

    crud.notification.create_user_notification_source(
        db=db,
        user_id=user.id,
        notification_source_id=db_notification_source.id,
        role=UserNotificationSourceRole.CREATOR
    )
    db.commit()

    return schemas.common.SuccessResponse()


@notification_source_manage_router.post("/source/update", response_model=schemas.common.NormalResponse)
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
        raise schemas.error.CustomException(message="You don't have permission to update this notification source", code=403)

    if update_notification_source_request.title is not None:
        db_notification_source.title = update_notification_source_request.title
    if update_notification_source_request.description is not None:
        db_notification_source.description = update_notification_source_request.description
    if update_notification_source_request.is_public is not None:
        db_notification_source.is_public = update_notification_source_request.is_public

    config_json = _build_notification_source_config_json(
        source_provided_uuid=db_notification_source.notification_source_provided.uuid,
        email_source_form=update_notification_source_request.email_source_form,
        ios_source_form=update_notification_source_request.ios_source_form,
        feishu_source_form=update_notification_source_request.feishu_source_form,
        telegram_source_form=update_notification_source_request.telegram_source_form,
        require_config=False,
    )

    if config_json is not None:
        db_notification_source.config_json = encrypt_notification_source_config(config_json)

    db.commit()
    return schemas.common.SuccessResponse()


@notification_source_manage_router.post('/source/provided', response_model=schemas.notification.NotificationSourcesProvidedResponse)
def get_provided_notification_source(
    db: Session = Depends(get_db),
    _user: models.user.User = Depends(get_current_user)
):
    db_notification_sources_provided = crud.notification.get_all_provided_notification_sources(
        db=db
    )
    notification_sources_provided = [
        schemas.notification.NotificationSourceProvided.model_validate(db_notification_source) for db_notification_source in db_notification_sources_provided
    ]
    return schemas.notification.NotificationSourcesProvidedResponse(data=notification_sources_provided)


@notification_source_manage_router.post("/source/fork", response_model=schemas.common.NormalResponse)
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
        db_user_notification_source.delete_at = now
        db.commit()
        return schemas.common.SuccessResponse()

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


@notification_source_manage_router.post('/source/usable', response_model=schemas.notification.NotificationSourcesUsableResponse)
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


@notification_source_manage_router.post("/source/delete", response_model=schemas.common.NormalResponse)
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
