import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import schemas
from common.dependencies import get_async_db, get_current_user, get_current_user_short_lived, get_real_ip
from common.jwt_utils import create_token
from common.oauth_redirect import build_public_oauth_redirect_uri
from common.tp_auth.github_utils import get_github_token, get_github_userInfo
from data.sql.base import async_session_context
from router.user_shared import (
    authorize_existing_oauth_user,
    commit_with_bucket_cleanup_async,
    setup_default_file_system_for_user_async,
)
from schemas.error import CustomException

user_auth_github_router = APIRouter()

@user_auth_github_router.post("/create/github", response_model=schemas.user.TokenResponse)
async def create_user_by_github(
    request: Request,
    user: schemas.user.GithubUserCreate,
    ip: str | None = Depends(get_real_ip)
):
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET')
    if GITHUB_CLIENT_ID is None or GITHUB_CLIENT_SECRET is None:
        raise CustomException(message="GitHub OAuth is not configured", code=500)

    redirect_uri = build_public_oauth_redirect_uri(
        request,
        "integrations/github/oauth2/create/callback",
    )
    token = await get_github_token(
        github_client_id=GITHUB_CLIENT_ID,
        github_client_secret=GITHUB_CLIENT_SECRET,
        code=user.code,
        redirect_uri=redirect_uri,
    )
    if token is None:
        raise CustomException(message="Failed to fetch GitHub account information", code=400)
    github_user_info = await get_github_userInfo(token=token.get('access_token'))
    async with async_session_context() as db:
        db_exist_github_user = await crud.user.get_github_user_by_github_user_id_async(
            db=db,
            github_user_id=str(github_user_info.get('id'))
        )
        if db_exist_github_user is not None:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=db_exist_github_user.user_id
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
            nickname=github_user_info.get('login'),
            avatar="files/default_avatar.png"
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)

        await crud.user.create_github_user_async(
            db=db,
            user_id=db_user.id,
            github_user_id=str(github_user_info.get('id')),
            github_user_name=github_user_info.get('login')
        )

        file_service = await setup_default_file_system_for_user_async(
            db=db,
            db_user=db_user,
        )
        await commit_with_bucket_cleanup_async(db=db, file_service=file_service)
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=3600)

@user_auth_github_router.post("/bind/github", response_model=schemas.common.NormalResponse)
async def bind_github(
    request: Request,
    bind_github: schemas.user.GithubUserBind,
    user = Depends(get_current_user_short_lived),
):
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET')
    if GITHUB_CLIENT_ID is None or GITHUB_CLIENT_SECRET is None:
        raise CustomException(message="GitHub OAuth is not configured", code=500)

    redirect_uri = build_public_oauth_redirect_uri(
        request,
        "integrations/github/oauth2/bind/callback",
    )
    token = await get_github_token(
        github_client_id=GITHUB_CLIENT_ID,
        github_client_secret=GITHUB_CLIENT_SECRET,
        code=bind_github.code,
        redirect_uri=redirect_uri
    )
    if token is None:
        raise CustomException(message="Failed to fetch GitHub account information", code=400)
    github_user_info = await get_github_userInfo(
        token=token.get('access_token')
    )

    async with async_session_context() as db:
        db_github_user_exist = await crud.user.get_github_user_by_user_id_async(
            db=db,
            user_id=user.id
        )
        if db_github_user_exist is not None:
            raise CustomException(message="A GitHub account is already bound to this user", code=400)

        db_github_exist = await crud.user.get_github_user_by_github_user_id_async(
            db=db,
            github_user_id=str(github_user_info.get('id'))
        )
        if db_github_exist is not None:
            raise CustomException(message="This GitHub account is already bound to another user", code=400)

        await crud.user.create_github_user_async(
            db=db,
            user_id=user.id,
            github_user_id=str(github_user_info.get('id')),
            github_user_name=github_user_info.get('login')
        )

        await db.commit()
        return schemas.common.SuccessResponse()

@user_auth_github_router.post('/unbind/github', response_model=schemas.common.NormalResponse)
async def unbind_github(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    await crud.user.delete_github_user_by_user_id_async(
        db=db,
        user_id=user.id
    )
    await db.commit()
    return schemas.common.SuccessResponse(message="The github account is unbinded successfully.")
