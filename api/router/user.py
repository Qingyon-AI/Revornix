import asyncio
import os
import random
import string
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from google.auth.transport import requests
from google.oauth2 import id_token
from jwt.exceptions import ExpiredSignatureError
from redis import Redis
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.celery.app import start_trigger_user_notification_event
from common.dependencies import (
    check_deployed_by_official,
    decode_jwt_token,
    get_cache,
    get_current_user,
    get_db,
    get_real_ip,
    reject_if_official,
)
from common.hash import verify_password
from common.jwt_utils import create_token
from common.logger import exception_logger
from common.sms.tencent_sms import TencentSms
from common.system_email.email import RevornixSystemEmail
from common.tp_auth.github_utils import get_github_token, get_github_userInfo
from common.tp_auth.google_utils import get_google_token
from common.tp_auth.wechat_utils import get_mini_wechat_tokens, get_web_user_info, get_web_wechat_tokens
from data.milvus.delete import delete_documents_from_milvus
from data.neo4j.delete import delete_documents_and_related_from_neo4j
from enums.document import DocumentCategory
from enums.file import RemoteFileService
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionRole
from enums.user import WeChatUserSource
from file.built_in_remote_file_service import BuiltInRemoteFileService
from official.hooks.user import on_user_created
from schemas.error import CustomException

user_router = APIRouter()

@user_router.post('/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
def search_user(
    search_user_request: schemas.user.SearchUserRequest,
    current_user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    has_more = True
    next_start = None
    users = []
    db_users = []
    db_next_user = None
    if search_user_request.filter_name == 'email':
        db_users = crud.user.search_user_by_email(
            db=db,
            keyword=search_user_request.filter_value,
            start=search_user_request.start,
            limit=search_user_request.limit
        )
        total = crud.user.count_user_by_email(
            db=db,
            keyword=search_user_request.filter_value
        )
        if len(db_users) < search_user_request.limit or len(db_users) == 0:
            has_more = False
        if len(db_users) == search_user_request.limit:
            db_next_user = crud.user.search_next_user_by_email(
                db=db,
                email_user=db_users[-1],
                keyword=search_user_request.filter_value
            )
    if search_user_request.filter_name == 'nickname':
        db_users = crud.user.search_user_by_nickname(
            db=db,
            keyword=search_user_request.filter_value,
            start=search_user_request.start,
            limit=search_user_request.limit
        )
        total = crud.user.count_user_by_nickname(
            db=db,
            keyword=search_user_request.filter_value
        )
        if len(db_users) < search_user_request.limit or len(db_users) == 0:
            has_more = False
        if len(db_users) == search_user_request.limit:
            db_next_user = crud.user.search_next_user_by_nickname(
                db=db,
                user=db_users[-1],
                keyword=search_user_request.filter_value
            )
    if search_user_request.filter_name == 'uuid':
        db_users = crud.user.search_user_by_uuid(
            db=db,
            uuid=search_user_request.filter_value,
            start=search_user_request.start,
            limit=search_user_request.limit
        )
        total = crud.user.count_user_by_uuid(
            db=db,
            uuid=search_user_request.filter_value
        )
        if len(db_users) < search_user_request.limit or len(db_users) == 0:
            has_more = False
        if len(db_users) == search_user_request.limit:
            db_next_user = crud.user.search_next_user_by_uuid(
                db=db,
                user=db_users[-1],
                uuid=search_user_request.filter_value
            )
    user_ids = [item.id for item in db_users]
    fans_by_user_id = crud.user.count_user_fans_by_user_ids(db=db, user_ids=user_ids)
    follows_by_user_id = crud.user.count_user_follows_by_user_ids(db=db, user_ids=user_ids)
    followed_user_ids = set()
    if current_user is not None:
        follow_rows = crud.user.get_user_follows_by_from_user_id_and_to_user_ids(
            db=db,
            from_user_id=current_user.id,
            to_user_ids=user_ids,
        )
        followed_user_ids = {row.to_user_id for row in follow_rows}

    for db_user in db_users:
        user_item = schemas.user.UserPublicInfo.model_validate(db_user)
        user_item.fans = fans_by_user_id.get(db_user.id, 0)
        user_item.follows = follows_by_user_id.get(db_user.id, 0)
        if db_user.id in followed_user_ids:
            user_item.is_followed = True
        users.append(user_item)

    has_more = db_next_user is not None
    next_start = db_next_user.id if db_next_user is not None else None

    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        start=search_user_request.start,
        limit=search_user_request.limit,
        has_more=has_more,
        next_start=next_start,
        elements=users
    )

@user_router.post('/default-file-system/update', response_model=schemas.common.NormalResponse)
def update_default_file_system(
    default_file_system_update_request: schemas.user.DefaultFileSystemUpdateRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user.default_user_file_system = default_file_system_update_request.default_user_file_system
    db.commit()
    return schemas.common.SuccessResponse(message="The default file system is updated successfully.")

@user_router.post('/default-engine/update', response_model=schemas.common.NormalResponse)
def update_default_engine(
    default_engine_update_request: schemas.user.DefaultEngineUpdateRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.update_user_default_engine(
        db=db,
        user_id=user.id,
        default_file_document_parse_user_engine_id=default_engine_update_request.default_file_document_parse_user_engine_id,
        default_website_document_parse_user_engine_id=default_engine_update_request.default_website_document_parse_user_engine_id,
        default_podcast_user_engine_id=default_engine_update_request.default_podcast_user_engine_id,
        default_image_generate_engine_id=default_engine_update_request.default_image_generate_engine_id
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The default engine is updated successfully.")

@user_router.post('/default-model/update', response_model=schemas.common.NormalResponse)
def update_default_model(
    default_model_update_request: schemas.user.DefaultModelUpdateRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.update_user_default_model(
        db=db,
        user_id=user.id,
        default_document_reader_model_id=default_model_update_request.default_document_reader_model_id,
        default_revornix_model_id=default_model_update_request.default_revornix_model_id
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The default model is updated successfully.")

@user_router.post('/fans', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
def search_user_fans(
    search_user_fans_request: schemas.user.SearchUserFansRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    has_more = True
    next_start = None
    next_user = None
    users = crud.user.search_user_fans(
        db=db,
        user_id=user.id,
        start=search_user_fans_request.start,
        limit=search_user_fans_request.limit,
        keyword=search_user_fans_request.keyword
    )
    if len(users) < search_user_fans_request.limit or len(users) == 0:
        has_more = False
    if len(users) == search_user_fans_request.limit:
        next_user = crud.user.search_next_user_fan(
            db=db,
            user=users[-1],
            keyword=search_user_fans_request.keyword
        )
        has_more = next_user is not None
        next_start = next_user.id if next_user is not None else None
    total = crud.user.count_user_fans(
        db=db,
        user_id=search_user_fans_request.user_id,
        keyword=search_user_fans_request.keyword
    )
    elements = []
    user_ids = [item.id for item in users]
    fans_by_user_id = crud.user.count_user_fans_by_user_ids(db=db, user_ids=user_ids)
    follows_by_user_id = crud.user.count_user_follows_by_user_ids(db=db, user_ids=user_ids)
    for item in users:
        element = schemas.user.UserPublicInfo.model_validate(item)
        element.fans = fans_by_user_id.get(item.id, 0)
        element.follows = follows_by_user_id.get(item.id, 0)
        elements.append(element)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=elements,
        start=search_user_fans_request.start,
        limit=search_user_fans_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@user_router.post('/follows', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
def search_user_follows(
    search_user_follows_request: schemas.user.SearchUserFollowsRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    has_more = True
    next_start = None
    next_user = None
    users = crud.user.search_user_follows(
        db=db,
        user_id=user.id,
        start=search_user_follows_request.start,
        limit=search_user_follows_request.limit,
        keyword=search_user_follows_request.keyword
    )
    if len(users) < search_user_follows_request.limit or len(users) == 0:
        has_more = False
    if len(users) == search_user_follows_request.limit:
        next_user = crud.user.search_next_user_follow(
            db=db,
            user=users[-1],
            keyword=search_user_follows_request.keyword
        )
        has_more = next_user is not None
        next_start = next_user.id if next_user is not None else None
    total = crud.user.count_user_follows(
        db=db,
        user_id=search_user_follows_request.user_id,
        keyword=search_user_follows_request.keyword
    )
    elements = []
    user_ids = [item.id for item in users]
    fans_by_user_id = crud.user.count_user_fans_by_user_ids(db=db, user_ids=user_ids)
    follows_by_user_id = crud.user.count_user_follows_by_user_ids(db=db, user_ids=user_ids)
    for item in users:
        element = schemas.user.UserPublicInfo.model_validate(item)
        element.fans = fans_by_user_id.get(item.id, 0)
        element.follows = follows_by_user_id.get(item.id, 0)
        elements.append(element)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=elements,
        start=search_user_follows_request.start,
        limit=search_user_follows_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@user_router.post('/follow', response_model=schemas.common.NormalResponse)
def follow_user(
    follow_user_request: schemas.user.FollowUserRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if follow_user_request.to_user_id == user.id:
        raise CustomException(message="You can't follow yourself", code=400)
    db_user = crud.user.get_user_by_id(
        db=db,
        user_id=follow_user_request.to_user_id
    )
    if db_user is None:
        raise CustomException(message="The user you want to follow is not exist", code=404)
    db_user_followed = crud.user.get_user_follow_by_to_user_id_and_from_user_id(
        db=db,
        to_user_id=follow_user_request.to_user_id,
        from_user_id=user.id
    )
    if db_user_followed is None and follow_user_request.status:
        crud.user.create_follow_user_record(
            db=db,
            to_user_id=follow_user_request.to_user_id,
            from_user_id=user.id
        )
    if db_user_followed is not None and not follow_user_request.status:
        crud.user.update_user_follow_by_to_user_id_and_from_user_id(
            db=db,
            to_user_id=follow_user_request.to_user_id,
            from_user_id=user.id,
            status=follow_user_request.status
        )

    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/info', response_model=schemas.user.UserPublicInfo)
def user_info(
    user_info_request: schemas.user.UserInfoRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_user = crud.user.get_user_by_id(
        db=db,
        user_id=user_info_request.user_id
    )
    if db_user is None:
        raise CustomException(message="The user you want to get the info is not exist", code=404)
    user_follow = crud.user.get_user_follow_by_to_user_id_and_from_user_id(
        db=db,
        to_user_id=user_info_request.user_id,
        from_user_id=user.id
    )
    if user_follow is not None and user_follow.delete_at is None:
        db_user.is_followed = True
    fans = crud.user.count_user_fans(
        db=db,
        user_id=user_info_request.user_id
    )
    follows = crud.user.count_user_follows(
        db=db,
        user_id=user_info_request.user_id
    )
    res = schemas.user.UserPublicInfo.model_validate(db_user)
    res.fans = fans
    res.follows = follows
    return res

@user_router.post("/create/email/code", response_model=schemas.common.NormalResponse)
async def create_user_by_email_code(
    email_create_request: schemas.user.EmailCreateRequest,
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_cache)
):
    if crud.user.get_user_by_email(
        db=db,
        email=email_create_request.email
    ):
        raise CustomException("The email already exists", code=400)
    else:
        code = "".join(random.sample(string.ascii_letters + string.digits, 6))
        await cache.set(
            name=email_create_request.email,
            value=code,
            ex=600
        )
        mail = RevornixSystemEmail()
        await mail.send(
            recipient=email_create_request.email,
            title="Revornix注册验证码",
            content=f"欢迎使用Revornix, 您的验证码为{code}, 有效期10分钟。",
            template='register.html'
        )
        return schemas.common.SuccessResponse(message="The code has been sent.")

@user_router.post('/create/email/verify', response_model=schemas.user.TokenResponse)
async def create_user_by_email_verify(
    email_user_create_verify_request: schemas.user.EmailUserCreateCodeVerifyRequest,
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_cache),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    ip: str | None = Depends(get_real_ip)
):
    if crud.user.get_user_by_email(
        db=db,
        email=email_user_create_verify_request.email
    ):
        raise Exception("The email is already exists")
    code = await cache.get(email_user_create_verify_request.email)
    if code != email_user_create_verify_request.code or code is None:
        raise Exception("Code is wrong")
    await cache.delete(email_user_create_verify_request.email)
    db_user = crud.user.create_base_user(
        db=db,
        nickname=email_user_create_verify_request.email,
        avatar="files/default_avatar.png"
    )
    db_user.last_login_ip = ip
    db_user.last_login_time = datetime.now(timezone.utc)

    crud.user.create_email_user(
        db=db,
        user_id=db_user.id,
        email=email_user_create_verify_request.email,
        password=email_user_create_verify_request.password,
        nickname=email_user_create_verify_request.email
    )
    # init the default file system for the user
    db_file_system = crud.file_system.get_file_system_by_uuid(
        db=db,
        uuid=RemoteFileService.Built_In.meta.id
    )
    if db_file_system is None:
        raise CustomException('The Built-In File System is Not Found', 404)
    db_user_file_system = crud.file_system.create_user_file_system(
        db=db,
        file_system_id=db_file_system.id,
        user_id=db_user.id,
        title="Default Minio File System",
        description="The default file system for the user"
    )
    db_user.default_user_file_system = db_user_file_system.id
    # create the minio file bucket for the user because it's the default file system
    await asyncio.to_thread(BuiltInRemoteFileService.ensure_bucket_exists, db_user.uuid)
    db.commit()
    if deployed_by_official:
        await on_user_created(
            user_id=db_user.id
        )
    access_token, refresh_token = create_token(db_user)
    if access_token is None or refresh_token is None:
        raise CustomException(message='The token is not created.')
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post('/create/email', response_model=schemas.user.TokenResponse, description='his api is only available for local use, and is disabled in the official deployment version')
def create_user_by_email(
    email_user_create_verify_request: schemas.user.EmailUserCreateVerifyRequest,
    db: Session = Depends(get_db),
    _ = Depends(reject_if_official),
    ip: str | None = Depends(get_real_ip)
):
    if crud.user.get_user_by_email(
        db=db,
        email=email_user_create_verify_request.email
    ):
        raise Exception("The email is already exists")
    db_user = crud.user.create_base_user(
        db=db,
        nickname=email_user_create_verify_request.email,
        avatar="files/default_avatar.png"
    )
    db_user.last_login_ip = ip
    db_user.last_login_time = datetime.now(timezone.utc)

    crud.user.create_email_user(
        db=db,
        user_id=db_user.id,
        email=email_user_create_verify_request.email,
        password=email_user_create_verify_request.password,
        nickname=email_user_create_verify_request.email
    )
    # init the default file system for the user
    db_file_system = crud.file_system.get_file_system_by_uuid(
        db=db,
        uuid=RemoteFileService.Built_In.meta.id
    )
    if db_file_system is None:
        raise CustomException('The Built-In File System is Not Found', 404)
    db_user_file_system = crud.file_system.create_user_file_system(
        db=db,
        file_system_id=db_file_system.id,
        user_id=db_user.id,
        title="Default Minio File System",
        description="The default file system for the user"
    )
    db_user.default_user_file_system = db_user_file_system.id
    # create the minio file bucket for the user because it's the default file system
    BuiltInRemoteFileService.ensure_bucket_exists(db_user.uuid)
    db.commit()
    access_token, refresh_token = create_token(db_user)
    if access_token is None or refresh_token is None:
        raise CustomException(message='The token is not created.')
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post('/password/update', response_model=schemas.common.NormalResponse)
def update_password(
    password_update_request: schemas.user.PasswordUpdateRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_email_user = crud.user.get_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if db_email_user is None:
        raise CustomException(message='The current user has no email info.')
    if not verify_password(
        stored_password=db_email_user.hashed_password,
        provided_password=password_update_request.origin_password
    ):
        raise CustomException(message='The origin password is wrong.', code=403)
    crud.user.update_user_password(
        db=db,
        user_id=user.id,
        password=password_update_request.new_password
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The password is updated successfully.")

@user_router.post('/bind/email/code', response_model=schemas.common.NormalResponse)
async def bind_email_code(
    bind_email_request: schemas.user.BindEmailRequest,
    cache: Redis = Depends(get_cache),
    db: Session = Depends(get_db)
):
    email_exist = crud.user.get_email_user_by_email(
        db=db,
        email=bind_email_request.email
    )
    if email_exist:
        raise Exception('The email is already exists')
    code = "".join(random.sample(string.ascii_letters + string.digits, 6))
    await cache.set(
        name=bind_email_request.email,
        value=code,
        ex=600
    )
    mail = RevornixSystemEmail()
    await mail.send(
        recipient=bind_email_request.email,
        title="Revornix邮箱绑定",
        content=f"你正在绑定邮箱, 验证码是 {code}"
    )
    return schemas.common.SuccessResponse(message='The code has been sent.')

@user_router.post('/bind/email/verify', response_model=schemas.common.NormalResponse)
async def bind_email_verify(
    bind_email_verify_request: schemas.user.BindEmailCodeVerifyRequest,
    user = Depends(get_current_user),
    cache: Redis = Depends(get_cache),
    db: Session = Depends(get_db)
):
    code = await cache.get(bind_email_verify_request.email)
    if code is None or code != bind_email_verify_request.code:
        raise Exception("Code is wrong.")
    await cache.delete(bind_email_verify_request.email)
    crud.user.create_email_user(
        db=db,
        user_id=user.id,
        email=bind_email_verify_request.email
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The email is binded successfully.")

@user_router.post('/bind/email', response_model=schemas.common.NormalResponse, description='This api is only available for local use, and is disabled in the official deployment version')
def bind_email(
    bind_email_verify_request: schemas.user.BindEmailVerifyRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
    _ = Depends(reject_if_official)
):
    db_exist_email_user = crud.user.get_email_user_by_email(
        db=db,
        email=bind_email_verify_request.email
    )
    if db_exist_email_user is not None:
        raise CustomException(message='The email is already exists.')
    db_user_email = crud.user.get_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if db_user_email is not None:
        crud.user.delete_email_user_by_user_id(
            db=db,
            user_id=user.id
        )
    crud.user.create_email_user(
        db=db,
        user_id=user.id,
        email=bind_email_verify_request.email
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The email is binded successfully.")

@user_router.post('/read-mark-reason/update', response_model=schemas.common.NormalResponse)
def update_my_default_read_mark_reason(
    default_read_mark_reason_update_request: schemas.user.DefaultReadMarkReasonUpdateRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.update_user_default_mark_read_reason(
        db=db,
        user_id=user.id,
        default_read_mark_reason=default_read_mark_reason_update_request.default_read_mark_reason
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The default read mark reason is updated successfully.")

@user_router.post('/update', response_model=schemas.common.NormalResponse)
def update_my_info(
    user_info_update_request: schemas.user.UserInfoUpdateRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.update_user_info(
        db=db,
        user_id=user.id,
        nickname=user_info_update_request.nickname,
        slogan=user_info_update_request.slogan,
        avatar=user_info_update_request.avatar
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The information of the user is updated successfully.")

@user_router.post('/password/initial-see', response_model=schemas.user.InitialPasswordResponse)
def initial_see_password(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email_user = crud.user.get_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if email_user is None:
        raise CustomException(message='The current user has no email info.')

    if email_user.has_seen_initial_password:
        raise CustomException(message='The current user has seen the initial password.')

    if email_user.initial_password is None:
        raise CustomException(message='The initial password is not set.')

    email_user.has_seen_initial_password = True
    db.commit()

    return schemas.user.InitialPasswordResponse(password=email_user.initial_password)

@user_router.post('/mine/info', response_model=schemas.user.PrivateUserInfo)
def my_info(
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res = schemas.user.PrivateUserInfo.model_validate(user)

    email_user = crud.user.get_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if email_user is not None:
        res.email_info = schemas.user.EmailInfo(
            email=email_user.email,
            is_initial_password=email_user.is_initial_password,
            has_seen_initial_password=email_user.has_seen_initial_password
        )

    google_user = crud.user.get_google_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if google_user is not None:
        res.google_info = schemas.user.GoogleInfo(google_user_id=google_user.google_user_id)

    github_user = crud.user.get_github_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if github_user is not None:
        res.github_info = schemas.user.GithubInfo(github_user_id=github_user.github_user_id)

    phone_user = crud.user.get_phone_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if phone_user is not None:
        res.phone_info = schemas.user.PhoneInfo(phone=phone_user.phone)

    wechat_users = crud.user.get_wechat_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if wechat_users is not None:
        res.wechat_infos = [schemas.user.WeChatInfo(wechat_open_id=wechat_user.wechat_user_open_id,
                                                    nickname=wechat_user.wechat_user_name,
                                                    platform=wechat_user.wechat_platform) for wechat_user in wechat_users]

    fans = crud.user.count_user_fans(
        db=db,
        user_id=user.id
    )
    follows = crud.user.count_user_follows(
        db=db,
        user_id=user.id
    )
    res.fans = fans
    res.follows = follows
    return res

# 邮箱密码登陆
@user_router.post("/login", response_model=schemas.user.TokenResponse)
def login(
    user_login_request: schemas.user.UserLoginRequest,
    db: Session = Depends(get_db),
    ip: str | None = Depends(get_real_ip)
):
    user = crud.user.get_user_by_email(
        db=db,
        email=user_login_request.email
    )
    if user is None:
        raise Exception("The email is not registered yet")
    if user.is_forbidden:
        raise schemas.error.CustomException(message="The user is forbidden", code=403)
    email_user = crud.user.get_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if email_user is None:
        raise Exception("The email is not registered yet")
    if not user or not verify_password(
        stored_password=email_user.hashed_password,
        provided_password=user_login_request.password
    ):
        raise Exception("Email or password is incorrect")
    user.last_login_ip = ip
    user.last_login_time = datetime.now(timezone.utc)
    db.commit()
    access_token, refresh_token = create_token(user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post("/token/update", response_model=schemas.user.TokenResponse)
def update_token(
    token_update_request: schemas.user.TokenUpdateRequest,
    db: Session = Depends(get_db),
    ip: str | None = Depends(get_real_ip)
):
    try:
        payload = decode_jwt_token(token=token_update_request.refresh_token)
    except ExpiredSignatureError as e:
        exception_logger.error(f"Decode refresh token error: {e}")
        return Exception("Refresh token is expired, please login again.")
    user_uuid: str | None = payload.get("sub")
    if user_uuid is None:
        raise Exception("Refresh token is invalid")
    user = crud.user.get_user_by_uuid(
        db=db,
        uuid=user_uuid
    )
    if user is None:
        raise Exception("The user for this refresh_token is not exist")
    user.last_login_ip = ip
    user.last_login_time = datetime.now(timezone.utc)
    db.commit()
    access_token, refresh_token = create_token(user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post('/delete', response_model=schemas.common.NormalResponse)
def delete_user(
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.delete_user_by_user_id(
        db=db,
        user_id=user.id
    )
    crud.user.delete_wechat_user_by_user_id(
        db=db,
        user_id=user.id
    )
    crud.user.delete_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    crud.user.delete_github_user_by_user_id(
        db=db,
        user_id=user.id
    )
    crud.user.delete_google_user_by_user_id(
        db=db,
        user_id=user.id
    )
    crud.user.delete_phone_user_by_user_id(
        db=db,
        user_id=user.id
    )
    db_documents = crud.document.get_documents_by_user_id(
        db=db,
        user_id=user.id
    )
    document_ids = [document.id for document in db_documents]

    crud.document.delete_user_documents_by_document_ids(
        db=db,
        document_ids=document_ids,
        user_id=user.id
    )
    crud.document.delete_document_labels_by_document_ids(
        db=db,
        document_ids=document_ids
    )
    crud.document.delete_document_notes_by_document_ids(
        db=db,
        document_ids=document_ids
    )
    for db_document in db_documents:
        if db_document.category == DocumentCategory.FILE:
            crud.document.delete_file_documents_by_document_ids(
                db=db,
                document_ids=document_ids
            )
        elif db_document.category == DocumentCategory.WEBSITE:
            crud.document.delete_website_documents_by_document_ids(
                db=db,
                document_ids=document_ids
            )
        elif db_document.category == DocumentCategory.QUICK_NOTE:
            crud.document.delete_quick_note_documents_by_document_ids(
                db=db,
                document_ids=document_ids
            )
    delete_documents_and_related_from_neo4j(
        doc_ids=document_ids
    )
    delete_documents_from_milvus(
        doc_ids=document_ids
    )
    db_sections = crud.section.get_sections_by_user_id(
        db=db,
        user_id=user.id
    )
    for db_section in db_sections:
        crud.section.delete_section_users_by_section_id(
            db=db,
            section_id=db_section.id
        )
        crud.section.delete_section_documents_by_section_id(
            db=db,
            section_id=db_section.id
        )
        crud.section.delete_section_labels_by_section_id(
            db=db,
            section_id=db_section.id
        )
        crud.section.delete_section_comments_by_section_id(
            db=db,
            section_id=db_section.id
        )
        crud.section.delete_section_by_section_id(
            db=db,
            section_id=db_section.id
        )
        db_users = crud.section.get_users_for_section_by_section_id(
            db=db,
            section_id=db_section.id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.SUBSCRIBER]
        )
        for db_user in db_users:
            if db_user.id != user.id:
                start_trigger_user_notification_event.delay(
                    user_id=db_user.id,
                    trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
                    params={
                        "section_id": db_section.id,
                        "user_id": db_user.id
                    }
                )

    db.commit()
    return schemas.common.SuccessResponse(message="The user is deleted successfully.")

@user_router.post("/create/google", response_model=schemas.user.TokenResponse)
async def create_user_by_google(
    user: schemas.user.GoogleUserCreate,
    db: Session = Depends(get_db),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    ip: str | None = Depends(get_real_ip)
):
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise Exception("Google client id or secret is not set")
    token = await asyncio.to_thread(
        get_google_token,
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        code=user.code,
        redirect_uri='https://app.revornix.com/integrations/google/oauth2/create/callback',
    )
    if token is None:
        raise Exception("something error while getting google account info")

    idinfo = await asyncio.to_thread(
        id_token.verify_oauth2_token,
        token.get('id_token'),
        requests.Request(),
        os.environ.get('GOOGLE_CLIENT_ID'),
    )
    db_google_user_exist = crud.user.get_google_user_by_google_id(
        db=db,
        google_user_id=idinfo.get('sub')
    )
    if db_google_user_exist is not None:
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=db_google_user_exist.user_id
        )
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )
    db_user = crud.user.create_base_user(
        db=db,
        avatar="files/default_avatar.png",
        nickname=idinfo.get('name')
    )
    db_user.last_login_ip = ip
    db_user.last_login_time = datetime.now(timezone.utc)

    crud.user.create_google_user(
        db=db,
        user_id=db_user.id,
        google_user_id=idinfo.get('sub'),
        google_user_name=idinfo.get('name')
    )
    # init the default file system for the user
    db_file_system = crud.file_system.get_file_system_by_uuid(
        db=db,
        uuid=RemoteFileService.Built_In.meta.id
    )
    if db_file_system is None:
        raise CustomException('The Built-In File System is Not Found', 404)
    db_user_file_system = crud.file_system.create_user_file_system(
        db=db,
        file_system_id=db_file_system.id,
        user_id=db_user.id,
        title="Default Minio File System",
        description="The default file system for the user"
    )
    db_user.default_user_file_system = db_user_file_system.id
    # create the minio file bucket for the user because it's the default file system
    await asyncio.to_thread(BuiltInRemoteFileService.ensure_bucket_exists, db_user.uuid)
    db.commit()
    if deployed_by_official:
        await on_user_created(
            user_id=db_user.id
        )
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post("/bind/google", response_model=schemas.common.NormalResponse)
def bind_google(
    bind_google: schemas.user.GoogleUserBind,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise Exception("Google client id or secret is not set")

    db_google_user_exist = crud.user.get_google_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if db_google_user_exist is not None:
        raise Exception("The account is already binded")

    token = get_google_token(
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        code=bind_google.code,
        redirect_uri='https://app.revornix.com/integrations/google/oauth2/bind/callback'
    )
    if token is None:
        raise Exception("Something is error while getting google account info")

    idinfo = id_token.verify_oauth2_token(token.get('id_token'),
                                          requests.Request(),
                                          os.environ.get('GOOGLE_CLIENT_ID'))

    db_google_exist = crud.user.get_google_user_by_google_id(
        db=db,
        google_user_id=idinfo.get('sub')
    )
    if db_google_exist is not None:
        raise Exception("The google account is already be binded")

    crud.user.create_google_user(
        db=db,
        user_id=user.id,
        google_user_id=idinfo.get('sub')
    )

    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/unbind/google', response_model=schemas.common.NormalResponse)
def unbind_google(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.delete_google_user_by_user_id(
        db=db,
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The google account is unbinded successfully.")

@user_router.post("/create/github", response_model=schemas.user.TokenResponse)
async def create_user_by_github(
    user: schemas.user.GithubUserCreate,
    db: Session = Depends(get_db),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    ip: str | None = Depends(get_real_ip)
):
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET')
    if GITHUB_CLIENT_ID is None or GITHUB_CLIENT_SECRET is None:
        raise Exception("Github client id or secret is not set")

    token = await asyncio.to_thread(
        get_github_token,
        github_client_id=GITHUB_CLIENT_ID,
        github_client_secret=GITHUB_CLIENT_SECRET,
        code=user.code,
        redirect_uri='https://app.revornix.com/integrations/github/oauth2/create/callback',
    )
    if token is None:
        raise Exception("some thing is error while getting github account info")
    github_user_info = await asyncio.to_thread(get_github_userInfo, token=token.get('access_token'))
    db_exist_github_user = crud.user.get_github_user_by_github_user_id(
        db=db,
        github_user_id=str(github_user_info.get('id'))
    )
    if db_exist_github_user is not None:
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=db_exist_github_user.user_id
        )
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )
    db_user = crud.user.create_base_user(
        db=db,
        nickname=github_user_info.get('login'),
        avatar="files/default_avatar.png"
    )
    db_user.last_login_ip = ip
    db_user.last_login_time = datetime.now(timezone.utc)

    crud.user.create_github_user(
        db=db,
        user_id=db_user.id,
        github_user_id=str(github_user_info.get('id')),
        github_user_name=github_user_info.get('login')
    )

    # init the default file system for the user
    db_file_system = crud.file_system.get_file_system_by_uuid(
        db=db,
        uuid=RemoteFileService.Built_In.meta.id
    )
    if db_file_system is None:
        raise CustomException('The Built-In File System is Not Found', 404)
    db_user_file_system = crud.file_system.create_user_file_system(
        db=db,
        file_system_id=db_file_system.id,
        user_id=db_user.id,
        title="Default Minio File System",
        description="The default file system for the user"
    )
    db_user.default_user_file_system = db_user_file_system.id
    # create the minio file bucket for the user because it's the default file system
    await asyncio.to_thread(BuiltInRemoteFileService.ensure_bucket_exists, db_user.uuid)
    db.commit()
    if deployed_by_official:
        await on_user_created(
            user_id=db_user.id
        )
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=3600)

@user_router.post("/bind/github", response_model=schemas.common.NormalResponse)
def bind_github(
    bind_github: schemas.user.GithubUserBind,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET')
    if GITHUB_CLIENT_ID is None or GITHUB_CLIENT_SECRET is None:
        raise Exception("Github client id or secret is not set")

    db_github_user_exist = crud.user.get_github_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if db_github_user_exist is not None:
        raise Exception("The account has already been bound")

    token = get_github_token(
        github_client_id=GITHUB_CLIENT_ID,
        github_client_secret=GITHUB_CLIENT_SECRET,
        code=bind_github.code,
        redirect_uri='https://app.revornix.com/integrations/github/oauth2/bind/callback'
    )
    if token is None:
        raise Exception("some thing is error while getting github account info")
    github_user_info = get_github_userInfo(
        token=token.get('access_token')
    )

    db_github_exist = crud.user.get_github_user_by_github_user_id(
        db=db,
        github_user_id=str(github_user_info.get('id'))
    )
    if db_github_exist is not None:
        raise Exception("The github account has been bound by other user")

    crud.user.create_github_user(
        db=db,
        user_id=user.id,
        github_user_id=str(github_user_info.get('id')),
        github_user_name=github_user_info.get('login')
    )

    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/unbind/github', response_model=schemas.common.NormalResponse)
def unbind_github(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.delete_github_user_by_user_id(
        db=db,
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse(message="The github account is unbinded successfully.")

@user_router.post('/create/sms/code', response_model=schemas.common.NormalResponse)
async def create_user_by_sms_code(
    sms_user_code_create_request: schemas.user.SmsUserCodeCreateRequest,
    cache: Redis = Depends(get_cache)
):
    code = "".join(random.sample(string.digits, 6))
    await cache.set(sms_user_code_create_request.phone, code, 600)

    def _send_sms():
        sms_client = TencentSms.get_official_sms_client()
        sms_client.send_register_msg(
            phone_numbers=[sms_user_code_create_request.phone],
            code=code
        )

    await asyncio.to_thread(_send_sms)

    return schemas.common.SuccessResponse()

@user_router.post('/create/sms/verify', response_model=schemas.user.TokenResponse)
async def create_user_by_sms_verify(
    sms_user_code_verify_request: schemas.user.SmsUserCodeVerifyCreate,
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_cache),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    ip: str | None = Depends(get_real_ip)
):
    code = await cache.get(sms_user_code_verify_request.phone)
    if code is None:
        raise Exception("The code is expired")
    if code != sms_user_code_verify_request.code:
        raise Exception("The code is wrong")
    await cache.delete(sms_user_code_verify_request.phone)
    phone_user_exist = crud.user.get_phone_user_by_phone(
        db=db,
        phone=sms_user_code_verify_request.phone
    )
    if phone_user_exist is not None:
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=phone_user_exist.user_id
        )
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )
    else:
        db_user = crud.user.create_base_user(
            db=db,
            nickname=f'Revornix User {uuid4().hex[:8]}',
            avatar="files/default_avatar.png"
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)

        crud.user.create_phone_user(
            db=db,
            user_id=db_user.id,
            phone=sms_user_code_verify_request.phone
        )
        # init the default file system for the user
        db_file_system = crud.file_system.get_file_system_by_uuid(
            db=db,
            uuid=RemoteFileService.Built_In.meta.id
        )
        if db_file_system is None:
            raise CustomException('The Built-In File System is Not Found', 404)
        db_user_file_system = crud.file_system.create_user_file_system(
            db=db,
            file_system_id=db_file_system.id,
            user_id=db_user.id,
            title="Default Minio File System",
            description="The default file system for the user"
        )
        db_user.default_user_file_system = db_user_file_system.id
        # create the minio file bucket for the user because it's the default file system
        await asyncio.to_thread(BuiltInRemoteFileService.ensure_bucket_exists, db_user.uuid)
        db.commit()
        if deployed_by_official:
            await on_user_created(
                user_id=db_user.id
            )
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )

@user_router.post('/bind/phone/code', response_model=schemas.common.NormalResponse)
async def bind_phone(
    bind_phone_code_create_request: schemas.user.BindPhoneCodeCreateRequest,
    user = Depends(get_current_user),
    cache: Redis = Depends(get_cache),
    db: Session = Depends(get_db)
):
    phone_exist = crud.user.get_phone_user_by_phone(
        db=db,
        phone=bind_phone_code_create_request.phone
    )
    if phone_exist:
        raise Exception('The phone number is already registered')
    code = "".join(random.sample(string.digits, 6))

    def _send_sms():
        sms_client = TencentSms.get_official_sms_client()
        sms_client.send_register_msg(
            phone_numbers=[bind_phone_code_create_request.phone],
            code=code
        )

    await asyncio.to_thread(_send_sms)

    await cache.set(bind_phone_code_create_request.phone, code, 600)
    return schemas.common.SuccessResponse()

@user_router.post('/bind/phone/verify', response_model=schemas.common.NormalResponse)
async def bind_phone_verify(
    bind_phone_code_verify_request: schemas.user.BindPhoneCodeVerifyRequest,
    user = Depends(get_current_user),
    cache: Redis = Depends(get_cache),
    db: Session = Depends(get_db)
):
    code = await cache.get(bind_phone_code_verify_request.phone)
    if code is None:
        raise Exception('The code is expired')
    if code != bind_phone_code_verify_request.code:
        raise Exception('The code is wrong')
    await cache.delete(bind_phone_code_verify_request.phone)
    crud.user.create_phone_user(
        db=db,
        user_id=user.id,
        phone=bind_phone_code_verify_request.phone
    )
    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/unbind/phone', response_model=schemas.common.NormalResponse)
def unbind_phone(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.delete_phone_user_by_user_id(
        db=db,
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/create/wechat/mini', response_model=schemas.user.TokenResponse)
async def create_user_by_wechat_mini(
    wechat_mini_user_create_request: schemas.user.WeChatMiniUserCreateRequest,
    db: Session = Depends(get_db),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    ip: str | None = Depends(get_real_ip)
):
    WECHAT_MINI_APP_ID = os.environ.get('WECHAT_MINI_APP_ID')
    WECHAT_MINI_APP_SECRET = os.environ.get('WECHAT_MINI_APP_SECRET')
    if WECHAT_MINI_APP_ID is None or WECHAT_MINI_APP_SECRET is None:
        raise CustomException('WeChat Mini Program Not Configured', 500)

    code = wechat_mini_user_create_request.code
    response_tokens = await asyncio.to_thread(get_mini_wechat_tokens, WECHAT_MINI_APP_ID, WECHAT_MINI_APP_SECRET, code)
    openid = response_tokens.openid
    union_id = response_tokens.unionid
    if openid is None or union_id is None:
        raise CustomException('WeChat Login Failed', 403)

    # 如果openid都已经存在了 那就说明这个用户在这个平台已经注册过了 直接返回token
    db_exist_wechat_user_by_open_id = crud.user.get_wechat_user_by_wechat_open_id(
        db=db,
        wechat_user_open_id=openid
    )
    if db_exist_wechat_user_by_open_id is not None:
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=db_exist_wechat_user_by_open_id.user_id
        )
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )

    # 微信创建方式 同一union_id只能创建一个用户
    db_exist_wechat_user_by_union_id = crud.user.get_wechat_user_by_wechat_union_id(
        db=db,
        wechat_user_union_id=union_id
    )

    if len(db_exist_wechat_user_by_union_id) == 0:
        nickname = f'Revornix User {uuid4().hex[:8]}'
        db_user = crud.user.create_base_user(
            db=db,
            avatar="files/default_avatar.png",
            nickname=nickname
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)

        crud.user.create_wechat_user(
            db=db,
            user_id=db_user.id,
            wechat_platform=WeChatUserSource.REVORNIX_MINI_PROGRAM,
            wechat_user_open_id=openid,
            wechat_user_union_id=union_id,
            wechat_user_name=nickname
        )
        # init the default file system for the user
        db_file_system = crud.file_system.get_file_system_by_uuid(
            db=db,
            uuid=RemoteFileService.Built_In.meta.id
        )
        if db_file_system is None:
            raise CustomException('The Built-In File System is Not Found', 404)
        db_user_file_system = crud.file_system.create_user_file_system(
            db=db,
            file_system_id=db_file_system.id,
            user_id=db_user.id,
            title="Default Minio File System",
            description="The default file system for the user"
        )
        db_user.default_user_file_system = db_user_file_system.id
        # create the minio file bucket for the user because it's the default file system
        await asyncio.to_thread(BuiltInRemoteFileService.ensure_bucket_exists, db_user.uuid)
    else:
        # TODO 优化一下微信用户的机制 现在的处理总感觉有些问题
        # 如果union_id已经存在 说明该用户已通过别的微信渠道注册过, 不需要新建文件系统等机制 仅仅再创建一个微信用户身份即可
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=db_exist_wechat_user_by_union_id[0].user_id
        )
        if db_user is None:
            raise CustomException('The Wechat User is Not Found by the exist info', 404)
        crud.user.create_wechat_user(
            db=db,
            user_id=db_user.id,
            wechat_platform=WeChatUserSource.REVORNIX_MINI_PROGRAM,
            wechat_user_open_id=openid,
            wechat_user_union_id=union_id,
            wechat_user_name=db_user.nickname
        )
    db.commit()
    if deployed_by_official:
        await on_user_created(
            user_id=db_user.id
        )
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post("/create/wechat/web", response_model=schemas.user.TokenResponse)
async def create_user_by_wechat_web(
    wechat_web_user_create_request: schemas.user.WeChatWebUserCreateRequest,
    db: Session = Depends(get_db),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    ip: str | None = Depends(get_real_ip)
):
    WECHAT_WEB_APP_ID = os.environ.get('WECHAT_WEB_APP_ID')
    WECHAT_WEB_APP_SECRET = os.environ.get('WECHAT_WEB_APP_SECRET')
    if WECHAT_WEB_APP_ID is None or WECHAT_WEB_APP_SECRET is None:
        raise CustomException('WeChat Web Not Configured', 500)

    code = wechat_web_user_create_request.code
    response_tokens = await asyncio.to_thread(get_web_wechat_tokens, WECHAT_WEB_APP_ID, WECHAT_WEB_APP_SECRET, code)
    access_token = response_tokens.access_token

    openid = response_tokens.openid
    union_id = response_tokens.unionid
    if access_token is None or openid is None or union_id is None:
        raise CustomException('WeChat Login Failed', 403)

    db_exist_wechat_user_by_openid = crud.user.get_wechat_user_by_wechat_open_id(
        db=db,
        wechat_user_open_id=openid
    )
    if db_exist_wechat_user_by_openid is not None:
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=db_exist_wechat_user_by_openid.user_id
        )
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=3600)

    db_exist_wechat_user_by_union_id = crud.user.get_wechat_user_by_wechat_union_id(
        db=db,
        wechat_user_union_id=union_id
    )
    if len(db_exist_wechat_user_by_union_id) == 0:
        # get the wechat user info
        response_user_info = await asyncio.to_thread(
            get_web_user_info,
            access_token=access_token,
            openid=openid,
        )
        nickname = response_user_info.get('nickname')
        db_user = crud.user.create_base_user(
            db=db,
            avatar="files/default_avatar.png",
            nickname=nickname
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)

        crud.user.create_wechat_user(
            db=db,
            user_id=db_user.id,
            wechat_platform=WeChatUserSource.REVORNIX_WEB_APP,
            wechat_user_open_id=openid,
            wechat_user_union_id=union_id,
            wechat_user_name=nickname
        )
        # init the default file system for the user
        db_file_system = crud.file_system.get_file_system_by_uuid(
            db=db,
            uuid=RemoteFileService.Built_In.meta.id
        )
        if db_file_system is None:
            raise CustomException('The Built-In File System is Not Found', 404)
        db_user_file_system = crud.file_system.create_user_file_system(
            db=db,
            file_system_id=db_file_system.id,
            user_id=db_user.id,
            title="Default Minio File System",
            description="The default file system for the user"
        )
        db_user.default_user_file_system = db_user_file_system.id
        # create the minio file bucket for the user because it's the default file system
        await asyncio.to_thread(BuiltInRemoteFileService.ensure_bucket_exists, db_user.uuid)
    else:
        db_user = crud.user.get_user_by_id(
            db=db,
            user_id=db_exist_wechat_user_by_union_id[0].user_id
        )
        if db_user is None:
            raise CustomException('The Wechat User is Not Found by the exist info', 404)
        crud.user.create_wechat_user(
            db=db,
            user_id=db_user.id,
            wechat_platform=WeChatUserSource.REVORNIX_MINI_PROGRAM,
            wechat_user_open_id=openid,
            wechat_user_union_id=union_id,
            wechat_user_name=db_user.nickname
        )
    db.commit()
    if deployed_by_official:
        await on_user_created(
            user_id=db_user.id
        )
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post("/bind/wechat/web", response_model=schemas.common.NormalResponse)
def bind_wechat(
    wechat_user_bind_request: schemas.user.WeChatWebUserBindRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    WECHAT_WEB_APP_ID = os.environ.get('WECHAT_WEB_APP_ID')
    WECHAT_WEB_APP_SECRET = os.environ.get('WECHAT_WEB_APP_SECRET')
    if WECHAT_WEB_APP_ID is None or WECHAT_WEB_APP_SECRET is None:
        raise CustomException('WeChat Web Not Configured', 500)
    db_wechat_user_exist = crud.user.get_wechat_user_by_user_id(
        db=db,
        user_id=user.id,
        filter_wechat_platform=WeChatUserSource.REVORNIX_WEB_APP
    )
    if len(db_wechat_user_exist) > 0:
        raise CustomException(message="This wechat account is alread be bounded", code=403)
    code = wechat_user_bind_request.code
    response_tokens = get_web_wechat_tokens(WECHAT_WEB_APP_ID, WECHAT_WEB_APP_SECRET, code)
    access_token = response_tokens.access_token
    openid = response_tokens.openid
    if access_token is None or openid is None:
        raise CustomException(message='WeChat Login Failed', code=400)
    union_id = response_tokens.unionid
    response_user_info = get_web_user_info(access_token, openid)
    nickname = response_user_info.get('nickname')
    db_github_exist = crud.user.get_wechat_user_by_wechat_open_id(
        db=db,
        wechat_user_open_id=openid
    )
    if db_github_exist is not None:
        raise Exception("The wechat account has been bound by other user")
    crud.user.create_wechat_user(
        db=db,
        user_id=user.id,
        wechat_platform=WeChatUserSource.REVORNIX_WEB_APP,
        wechat_user_open_id=openid,
        wechat_user_union_id=union_id,
        wechat_user_name=nickname
    )
    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/unbind/wechat', response_model=schemas.common.NormalResponse)
def unbind_wechat(
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.user.delete_wechat_user_by_user_id(
        db=db,
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse()
