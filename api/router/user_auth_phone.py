import asyncio
import secrets
import string
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import schemas
from common.dependencies import get_async_db, get_cache, get_current_user, get_real_ip
from common.jwt_utils import create_token
from common.sms.tencent_sms import TencentSms
from router.user_shared import (
    authorize_existing_oauth_user,
    commit_with_bucket_cleanup_async,
    setup_default_file_system_for_user_async,
)
from schemas.error import CustomException

user_auth_phone_router = APIRouter()

@user_auth_phone_router.post('/create/sms/code', response_model=schemas.common.NormalResponse)
async def create_user_by_sms_code(
    sms_user_code_create_request: schemas.user.SmsUserCodeCreateRequest,
    cache: Redis = Depends(get_cache)
):
    code = "".join(secrets.choice(string.digits) for _ in range(6))
    await cache.set(
        name=f'user-create-sms-{sms_user_code_create_request.phone}',
        value=code,
        ex=600
    )

    def _send_sms():
        sms_client = TencentSms.get_official_sms_client()
        sms_client.send_register_msg(
            phone_numbers=[sms_user_code_create_request.phone],
            code=code
        )

    await asyncio.to_thread(_send_sms)

    return schemas.common.SuccessResponse()

@user_auth_phone_router.post('/create/sms/verify', response_model=schemas.user.TokenResponse)
async def create_user_by_sms_verify(
    sms_user_code_verify_request: schemas.user.SmsUserCodeVerifyCreate,
    db: AsyncSession = Depends(get_async_db),
    cache: Redis = Depends(get_cache),
    ip: str | None = Depends(get_real_ip)
):
    code = await cache.get(
        name=f'user-create-sms-{sms_user_code_verify_request.phone}'
    )
    if code is None:
        raise CustomException(message="Verification code has expired", code=400)
    if code != sms_user_code_verify_request.code:
        raise CustomException(message="Verification code is incorrect", code=400)
    await cache.delete(
        f'user-create-sms-{sms_user_code_verify_request.phone}'
    )
    phone_user_exist = await crud.user.get_phone_user_by_phone_async(
        db=db,
        phone=sms_user_code_verify_request.phone
    )
    if phone_user_exist is not None:
        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=phone_user_exist.user_id
        )
        await authorize_existing_oauth_user(db=db, db_user=db_user, ip=ip)
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )
    else:
        db_user = await crud.user.create_base_user_async(
            db=db,
            nickname=f'Revornix User {uuid4().hex[:8]}',
            avatar="files/default_avatar.png"
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)

        await crud.user.create_phone_user_async(
            db=db,
            user_id=db_user.id,
            phone=sms_user_code_verify_request.phone
        )
        file_service = await setup_default_file_system_for_user_async(
            db=db,
            db_user=db_user,
        )
        await commit_with_bucket_cleanup_async(db=db, file_service=file_service)
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )

@user_auth_phone_router.post('/bind/phone/code', response_model=schemas.common.NormalResponse)
async def bind_phone(
    bind_phone_code_create_request: schemas.user.BindPhoneCodeCreateRequest,
    user = Depends(get_current_user),
    cache: Redis = Depends(get_cache),
    db: AsyncSession = Depends(get_async_db)
):
    phone_exist = await crud.user.get_phone_user_by_phone_async(
        db=db,
        phone=bind_phone_code_create_request.phone
    )
    if phone_exist:
        raise CustomException(message='Phone number is already registered', code=400)
    code = "".join(secrets.choice(string.digits) for _ in range(6))

    def _send_sms():
        sms_client = TencentSms.get_official_sms_client()
        sms_client.send_register_msg(
            phone_numbers=[bind_phone_code_create_request.phone],
            code=code
        )

    await asyncio.to_thread(_send_sms)

    await cache.set(
        name=f'{user.id}-user-bind-sms-{bind_phone_code_create_request.phone}',
        value=code,
        ex=600
    )
    return schemas.common.SuccessResponse()

@user_auth_phone_router.post('/bind/phone/verify', response_model=schemas.common.NormalResponse)
async def bind_phone_verify(
    bind_phone_code_verify_request: schemas.user.BindPhoneCodeVerifyRequest,
    user = Depends(get_current_user),
    cache: Redis = Depends(get_cache),
    db: AsyncSession = Depends(get_async_db)
):
    code = await cache.get(
        name=f'{user.id}-user-bind-sms-{bind_phone_code_verify_request.phone}'
    )
    if code is None:
        raise CustomException(message='Verification code has expired', code=400)
    if code != bind_phone_code_verify_request.code:
        raise CustomException(message='Verification code is incorrect', code=400)
    await cache.delete(
        f'{user.id}-user-bind-sms-{bind_phone_code_verify_request.phone}'
    )
    phone_exist = await crud.user.get_phone_user_by_phone_async(
        db=db,
        phone=bind_phone_code_verify_request.phone
    )
    if phone_exist:
        raise CustomException(message='Phone number is already registered', code=400)
    await crud.user.create_phone_user_async(
        db=db,
        user_id=user.id,
        phone=bind_phone_code_verify_request.phone
    )
    await db.commit()
    return schemas.common.SuccessResponse()

@user_auth_phone_router.post('/unbind/phone', response_model=schemas.common.NormalResponse)
async def unbind_phone(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    await crud.user.delete_phone_user_by_user_id_async(
        db=db,
        user_id=user.id
    )
    await db.commit()
    return schemas.common.SuccessResponse()
