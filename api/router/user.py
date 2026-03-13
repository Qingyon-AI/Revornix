import asyncio
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from jwt.exceptions import ExpiredSignatureError
from redis import Redis
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.celery.app import start_trigger_user_notification_event
from common.dependencies import (
    decode_jwt_token,
    get_cache,
    get_current_user,
    get_current_user_without_throw,
    get_db,
    get_real_ip,
    reject_if_official,
)
from common.file import get_remote_file_signed_url
from common.hash import verify_password
from common.jwt_utils import create_token
from common.logger import exception_logger, format_log_message
from common.system_email.email import RevornixSystemEmail
from data.milvus.delete import delete_documents_from_milvus
from data.neo4j.delete import delete_documents_and_related_from_neo4j
from enums.document import DocumentCategory
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionRole
from router.user_shared import commit_with_bucket_cleanup, setup_default_file_system_for_user
from schemas.error import CustomException

user_router = APIRouter()


async def _batch_sign_user_avatars(
    users: list[schemas.user.UserPublicInfo],
) -> None:
    users_need_sign = [item for item in users if item.avatar is not None]
    if len(users_need_sign) == 0:
        return
    signed_avatar_urls = await asyncio.gather(
        *[
            get_remote_file_signed_url(
                user_id=item.id,
                file_name=item.avatar,
            )
            for item in users_need_sign
        ]
    )
    for item, signed_avatar_url in zip(users_need_sign, signed_avatar_urls, strict=False):
        item.avatar = signed_avatar_url

@user_router.post('/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
async def search_user(
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
    await _batch_sign_user_avatars(users=users)

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
        default_image_generate_engine_id=default_engine_update_request.default_image_generate_engine_id,
        default_audio_transcribe_engine_id=default_engine_update_request.default_audio_transcribe_engine_id
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
async def search_user_fans(
    search_user_fans_request: schemas.user.SearchUserFansRequest,
    _current_user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    has_more = True
    next_start = None
    next_user = None
    users = crud.user.search_user_fans(
        db=db,
        user_id=search_user_fans_request.user_id,
        start=search_user_fans_request.start,
        limit=search_user_fans_request.limit,
        keyword=search_user_fans_request.keyword
    )
    if len(users) < search_user_fans_request.limit or len(users) == 0:
        has_more = False
    if len(users) == search_user_fans_request.limit:
        next_user = crud.user.search_next_user_fan(
            db=db,
            user_id=search_user_fans_request.user_id,
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
    await _batch_sign_user_avatars(users=elements)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=elements,
        start=search_user_fans_request.start,
        limit=search_user_fans_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@user_router.post('/follows', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
async def search_user_follows(
    search_user_follows_request: schemas.user.SearchUserFollowsRequest,
    _current_user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    has_more = True
    next_start = None
    next_user = None
    users = crud.user.search_user_follows(
        db=db,
        user_id=search_user_follows_request.user_id,
        start=search_user_follows_request.start,
        limit=search_user_follows_request.limit,
        keyword=search_user_follows_request.keyword
    )
    if len(users) < search_user_follows_request.limit or len(users) == 0:
        has_more = False
    if len(users) == search_user_follows_request.limit:
        next_user = crud.user.search_next_user_follow(
            db=db,
            user_id=search_user_follows_request.user_id,
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
    await _batch_sign_user_avatars(users=elements)
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
        raise CustomException(message="User to follow not found", code=404)
    db_user_followed = crud.user.get_user_follow_by_to_user_id_and_from_user_id(
        db=db,
        to_user_id=follow_user_request.to_user_id,
        from_user_id=user.id,
        include_deleted=True,
    )
    if db_user_followed is None:
        if follow_user_request.status:
            crud.user.create_follow_user_record(
                db=db,
                to_user_id=follow_user_request.to_user_id,
                from_user_id=user.id,
            )
    else:
        is_following = db_user_followed.delete_at is None
        if is_following != follow_user_request.status:
            crud.user.update_user_follow_by_to_user_id_and_from_user_id(
                db=db,
                to_user_id=follow_user_request.to_user_id,
                from_user_id=user.id,
                status=follow_user_request.status,
            )

    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/info', response_model=schemas.user.UserPublicInfo)
async def user_info(
    user_info_request: schemas.user.UserInfoRequest,
    user: models.user.User | None = Depends(get_current_user_without_throw),
    db: Session = Depends(get_db)
):
    db_user = crud.user.get_user_by_id(
        db=db,
        user_id=user_info_request.user_id
    )
    if db_user is None:
        raise CustomException(message="User not found", code=404)
    if user is not None:
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
    if res.avatar is not None:
        res.avatar = await get_remote_file_signed_url(
            user_id=res.id,
            file_name=res.avatar,
        )
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
        raise CustomException("Email already exists", code=400)
    else:
        code = "".join(random.sample(string.ascii_letters + string.digits, 6))
        await cache.set(
            name=f'user-create-by-email-{email_create_request.email}',
            value=code,
            ex=600
        )
        mail = RevornixSystemEmail()
        await mail.send(
            recipient=email_create_request.email,
            title="Revornix registration verification code",
            content=f"Welcome to Revornix. Your verification code is {code}. It is valid for 10 minutes.",
            template='register.html'
        )
        return schemas.common.SuccessResponse(message="The code has been sent.")

@user_router.post('/create/email/verify', response_model=schemas.user.TokenResponse)
async def create_user_by_email_verify(
    email_user_create_verify_request: schemas.user.EmailUserCreateCodeVerifyRequest,
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_cache),
    ip: str | None = Depends(get_real_ip)
):
    if crud.user.get_user_by_email(
        db=db,
        email=email_user_create_verify_request.email
    ):
        raise CustomException(message="Email already exists", code=400)
    code = await cache.get(
        name=f'user-create-by-email-{email_user_create_verify_request.email}'
    )
    if code != email_user_create_verify_request.code or code is None:
        raise CustomException(message="Verification code is incorrect", code=400)
    await cache.delete(
        f'user-create-by-email-{email_user_create_verify_request.email}'
    )
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
    file_service = await setup_default_file_system_for_user(
        db=db,
        db_user=db_user,
    )
    await commit_with_bucket_cleanup(db=db, file_service=file_service)
    access_token, refresh_token = create_token(db_user)
    if access_token is None or refresh_token is None:
        raise CustomException(message='Failed to create authentication token', code=500)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_router.post('/create/email', response_model=schemas.user.TokenResponse, description='his api is only available for local use, and is disabled in the official deployment version')
async def create_user_by_email(
    email_user_create_verify_request: schemas.user.EmailUserCreateVerifyRequest,
    db: Session = Depends(get_db),
    _ = Depends(reject_if_official),
    ip: str | None = Depends(get_real_ip)
):
    if crud.user.get_user_by_email(
        db=db,
        email=email_user_create_verify_request.email
    ):
        raise CustomException(message="Email already exists", code=400)
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
    file_service = await setup_default_file_system_for_user(
        db=db,
        db_user=db_user,
    )
    await commit_with_bucket_cleanup(db=db, file_service=file_service)
    access_token, refresh_token = create_token(db_user)
    if access_token is None or refresh_token is None:
        raise CustomException(message='Failed to create authentication token', code=500)
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
        raise CustomException(message='Current user has no email address', code=400)
    if not verify_password(
        stored_password=db_email_user.hashed_password,
        provided_password=password_update_request.origin_password
    ):
        raise CustomException(message='Current password is incorrect', code=403)
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
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    email_exist = crud.user.get_email_user_by_email(
        db=db,
        email=bind_email_request.email
    )
    if email_exist:
        raise CustomException(message='Email already exists', code=400)
    code = "".join(random.sample(string.ascii_letters + string.digits, 6))
    await cache.set(
        name=f'{user.id}-user-bind-email-{bind_email_request.email}',
        value=code,
        ex=600
    )
    mail = RevornixSystemEmail()
    await mail.send(
        recipient=bind_email_request.email,
        title="Revornix email binding",
        content=f"You are binding your email address. Your verification code is {code}."
    )
    return schemas.common.SuccessResponse(message='The code has been sent.')

@user_router.post('/bind/email/verify', response_model=schemas.common.NormalResponse)
async def bind_email_verify(
    bind_email_verify_request: schemas.user.BindEmailCodeVerifyRequest,
    user = Depends(get_current_user),
    cache: Redis = Depends(get_cache),
    db: Session = Depends(get_db)
):
    code = await cache.get(
        name=f'{user.id}-user-bind-email-{bind_email_verify_request.email}'
    )
    if code is None or code != bind_email_verify_request.code:
        raise CustomException(message="Verification code is incorrect", code=400)
    await cache.delete(
        f'{user.id}-user-bind-email-{bind_email_verify_request.email}'
    )
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
        raise CustomException(message='Email already exists', code=400)
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
        raise CustomException(message='Current user has no email address', code=400)

    if email_user.has_seen_initial_password:
        raise CustomException(message='Initial password has already been viewed', code=400)

    if email_user.initial_password is None:
        raise CustomException(message='Initial password is not set', code=400)

    email_user.has_seen_initial_password = True
    db.commit()

    return schemas.user.InitialPasswordResponse(password=email_user.initial_password)

@user_router.post('/mine/info', response_model=schemas.user.PrivateUserInfo)
async def my_info(
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res = schemas.user.PrivateUserInfo.model_validate(user)
    if res.avatar is not None:
        res.avatar = await get_remote_file_signed_url(
            user_id=user.id,
            file_name=res.avatar
        )

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
        raise CustomException(message="Email is not registered", code=404)
    if user.is_forbidden:
        raise schemas.error.CustomException(message="User is forbidden", code=403)
    email_user = crud.user.get_email_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if email_user is None:
        raise CustomException(message="Email is not registered", code=404)
    if not user or not verify_password(
        stored_password=email_user.hashed_password,
        provided_password=user_login_request.password
    ):
        # Login endpoint should not return 401, otherwise frontend global 401
        # interceptor may trigger meaningless refresh-token loops.
        raise CustomException(message="Email or password is incorrect", code=400)
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
        exception_logger.warning(
            format_log_message("refresh_token_decode_failed", error=e)
        )
        # Refresh endpoint should not return 401 to avoid refresh-loop in frontend.
        raise CustomException(message="Refresh token has expired, please log in again", code=403) from e
    user_uuid: str | None = payload.get("sub")
    if user_uuid is None:
        raise CustomException(message="Refresh token is invalid", code=403)
    user = crud.user.get_user_by_uuid(
        db=db,
        uuid=user_uuid
    )
    if user is None:
        raise CustomException(message="User for this refresh token was not found", code=403)
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
    removed_from_section_notifications_to_send: list[tuple[int, int]] = []

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

    crud.task.cancel_document_tasks_by_document_ids(
        db=db,
        document_ids=document_ids
    )
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
    file_document_ids = [
        db_document.id
        for db_document in db_documents
        if db_document.category == DocumentCategory.FILE
    ]
    website_document_ids = [
        db_document.id
        for db_document in db_documents
        if db_document.category == DocumentCategory.WEBSITE
    ]
    quick_note_document_ids = [
        db_document.id
        for db_document in db_documents
        if db_document.category == DocumentCategory.QUICK_NOTE
    ]
    audio_document_ids = [
        db_document.id
        for db_document in db_documents
        if db_document.category == DocumentCategory.AUDIO
    ]
    if file_document_ids:
        crud.document.delete_file_documents_by_document_ids(
            db=db,
            document_ids=file_document_ids
        )
    if website_document_ids:
        crud.document.delete_website_documents_by_document_ids(
            db=db,
            document_ids=website_document_ids
        )
    if quick_note_document_ids:
        crud.document.delete_quick_note_documents_by_document_ids(
            db=db,
            document_ids=quick_note_document_ids
        )
    if audio_document_ids:
        crud.document.delete_audio_documents_by_document_ids(
            db=db,
            document_ids=audio_document_ids
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
        db_users = crud.section.get_users_for_section_by_section_id(
            db=db,
            section_id=db_section.id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.SUBSCRIBER]
        )
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
        for db_user in db_users:
            if db_user.id != user.id:
                removed_from_section_notifications_to_send.append((db_user.id, db_section.id))

    db.commit()
    for target_user_id, section_id in removed_from_section_notifications_to_send:
        start_trigger_user_notification_event.delay(
            user_id=target_user_id,
            trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
            params={
                "section_id": section_id,
                "user_id": target_user_id
            }
        )
    return schemas.common.SuccessResponse(message="The user is deleted successfully.")
