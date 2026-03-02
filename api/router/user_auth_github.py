import asyncio
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

import crud
import schemas
from common.dependencies import get_current_user, get_db, get_real_ip
from common.jwt_utils import create_token
from common.tp_auth.github_utils import get_github_token, get_github_userInfo
from router.user_shared import commit_with_bucket_cleanup, setup_default_file_system_for_user
from schemas.error import CustomException

user_auth_github_router = APIRouter()

@user_auth_github_router.post("/create/github", response_model=schemas.user.TokenResponse)
async def create_user_by_github(
    request: Request,
    user: schemas.user.GithubUserCreate,
    db: Session = Depends(get_db),
    ip: str | None = Depends(get_real_ip)
):
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET')
    if GITHUB_CLIENT_ID is None or GITHUB_CLIENT_SECRET is None:
        raise CustomException(message="Github client id or secret is not set", code=500)

    redirect_uri = str(request.base_url) + "integrations/github/oauth2/create/callback"
    token = await asyncio.to_thread(
        get_github_token,
        github_client_id=GITHUB_CLIENT_ID,
        github_client_secret=GITHUB_CLIENT_SECRET,
        code=user.code,
        redirect_uri=redirect_uri,
    )
    if token is None:
        raise CustomException(message="some thing is error while getting github account info", code=400)
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

    file_service = await setup_default_file_system_for_user(
        db=db,
        db_user=db_user,
    )
    await commit_with_bucket_cleanup(db=db, file_service=file_service)
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=3600)

@user_auth_github_router.post("/bind/github", response_model=schemas.common.NormalResponse)
def bind_github(
    request: Request,
    bind_github: schemas.user.GithubUserBind,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET')
    if GITHUB_CLIENT_ID is None or GITHUB_CLIENT_SECRET is None:
        raise CustomException(message="Github client id or secret is not set", code=500)

    db_github_user_exist = crud.user.get_github_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if db_github_user_exist is not None:
        raise CustomException(message="The account has already been bound", code=400)

    redirect_uri = str(request.base_url) + "integrations/github/oauth2/bind/callback"
    token = get_github_token(
        github_client_id=GITHUB_CLIENT_ID,
        github_client_secret=GITHUB_CLIENT_SECRET,
        code=bind_github.code,
        redirect_uri=redirect_uri
    )
    if token is None:
        raise CustomException(message="some thing is error while getting github account info", code=400)
    github_user_info = get_github_userInfo(
        token=token.get('access_token')
    )

    db_github_exist = crud.user.get_github_user_by_github_user_id(
        db=db,
        github_user_id=str(github_user_info.get('id'))
    )
    if db_github_exist is not None:
        raise CustomException(message="The github account has been bound by other user", code=400)

    crud.user.create_github_user(
        db=db,
        user_id=user.id,
        github_user_id=str(github_user_info.get('id')),
        github_user_name=github_user_info.get('login')
    )

    db.commit()
    return schemas.common.SuccessResponse()

@user_auth_github_router.post('/unbind/github', response_model=schemas.common.NormalResponse)
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
