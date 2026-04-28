import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import schemas
from common.dependencies import get_async_db, get_current_user, get_current_user_short_lived, get_real_ip
from common.jwt_utils import create_token
from common.oauth_redirect import build_public_oauth_redirect_uri
from common.tp_auth.google_utils import get_google_token, get_google_token_info
from data.sql.base import async_session_context
from router.user_shared import (
    authorize_existing_oauth_user,
    commit_with_bucket_cleanup_async,
    setup_default_file_system_for_user_async,
)
from schemas.error import CustomException

user_auth_google_router = APIRouter()

@user_auth_google_router.post("/create/google", response_model=schemas.user.TokenResponse)
async def create_user_by_google(
    request: Request,
    user: schemas.user.GoogleUserCreate,
    ip: str | None = Depends(get_real_ip),
):
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise CustomException(message="Google OAuth is not configured", code=500)

    redirect_uri = build_public_oauth_redirect_uri(
        request,
        "integrations/google/oauth2/create/callback",
    )
    token = await get_google_token(
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        code=user.code,
        redirect_uri=redirect_uri,
    )
    if token is None:
        raise CustomException(message="Failed to fetch Google account information", code=400)

    idinfo = await get_google_token_info(token.get('id_token'))
    if idinfo.get('aud') != GOOGLE_CLIENT_ID:
        raise CustomException(message="Google ID token audience is invalid", code=400)
    issuer = idinfo.get('iss')
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise CustomException(message="Google ID token issuer is invalid", code=400)
    async with async_session_context() as db:
        db_google_user_exist = await crud.user.get_google_user_by_google_id_async(
            db=db,
            google_user_id=idinfo.get('sub')
        )
        if db_google_user_exist is not None:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=db_google_user_exist.user_id
            )
            await authorize_existing_oauth_user(db=db, db_user=db_user, ip=ip)
            access_token, refresh_token = create_token(db_user)
            return schemas.user.TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=3600
            )
        db_user = await crud.user.create_base_user_async(
            db=db,
            avatar="files/default_avatar.png",
            nickname=idinfo.get('name')
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)

        await crud.user.create_google_user_async(
            db=db,
            user_id=db_user.id,
            google_user_id=idinfo.get('sub'),
            google_user_name=idinfo.get('name')
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

@user_auth_google_router.post("/bind/google", response_model=schemas.common.NormalResponse)
async def bind_google(
    request: Request,
    bind_google: schemas.user.GoogleUserBind,
    user = Depends(get_current_user_short_lived),
):
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise CustomException(message="Google OAuth is not configured", code=500)

    redirect_uri = build_public_oauth_redirect_uri(
        request,
        "integrations/google/oauth2/bind/callback",
    )
    token = await get_google_token(
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        code=bind_google.code,
        redirect_uri=redirect_uri
    )
    if token is None:
        raise CustomException(message="Failed to fetch Google account information", code=400)

    idinfo = await get_google_token_info(token.get('id_token'))
    if idinfo.get('aud') != GOOGLE_CLIENT_ID:
        raise CustomException(message="Google ID token audience is invalid", code=400)
    issuer = idinfo.get('iss')
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise CustomException(message="Google ID token issuer is invalid", code=400)

    async with async_session_context() as db:
        db_google_user_exist = await crud.user.get_google_user_by_user_id_async(
            db=db,
            user_id=user.id
        )
        if db_google_user_exist is not None:
            raise CustomException(message="A Google account is already bound to this user", code=400)

        db_google_exist = await crud.user.get_google_user_by_google_id_async(
            db=db,
            google_user_id=idinfo.get('sub')
        )
        if db_google_exist is not None:
            raise CustomException(message="This Google account is already bound to another user", code=400)

        await crud.user.create_google_user_async(
            db=db,
            user_id=user.id,
            google_user_id=idinfo.get('sub')
        )

        await db.commit()
        return schemas.common.SuccessResponse()

@user_auth_google_router.post('/unbind/google', response_model=schemas.common.NormalResponse)
async def unbind_google(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    await crud.user.delete_google_user_by_user_id_async(
        db=db,
        user_id=user.id
    )
    await db.commit()
    return schemas.common.SuccessResponse(message="The google account is unbinded successfully.")
