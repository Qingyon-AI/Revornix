import asyncio
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

import crud
import schemas
from common.dependencies import get_current_user, get_db, get_real_ip
from common.jwt_utils import create_token
from common.tp_auth.google_utils import get_google_token
from router.user_shared import commit_with_bucket_cleanup, setup_default_file_system_for_user
from schemas.error import CustomException

user_auth_google_router = APIRouter()

@user_auth_google_router.post("/create/google", response_model=schemas.user.TokenResponse)
async def create_user_by_google(
    request: Request,
    user: schemas.user.GoogleUserCreate,
    db: Session = Depends(get_db),
    ip: str | None = Depends(get_real_ip),
):
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise CustomException(message="Google client id or secret is not set", code=500)

    redirect_uri = str(request.base_url) + "integrations/google/oauth2/create/callback"
    token = await asyncio.to_thread(
        get_google_token,
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        code=user.code,
        redirect_uri=redirect_uri,
    )
    if token is None:
        raise CustomException(message="something error while getting google account info", code=400)

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
    file_service = await setup_default_file_system_for_user(
        db=db,
        db_user=db_user,
    )
    await commit_with_bucket_cleanup(db=db, file_service=file_service)
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600
    )

@user_auth_google_router.post("/bind/google", response_model=schemas.common.NormalResponse)
def bind_google(
    request: Request,
    bind_google: schemas.user.GoogleUserBind,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise CustomException(message="Google client id or secret is not set", code=500)

    db_google_user_exist = crud.user.get_google_user_by_user_id(
        db=db,
        user_id=user.id
    )
    if db_google_user_exist is not None:
        raise CustomException(message="The account is already binded", code=400)

    redirect_uri = str(request.base_url) + "integrations/google/oauth2/bind/callback"
    token = get_google_token(
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        code=bind_google.code,
        redirect_uri=redirect_uri
    )
    if token is None:
        raise CustomException(message="Something is error while getting google account info", code=400)

    idinfo = id_token.verify_oauth2_token(token.get('id_token'),
                                          requests.Request(),
                                          os.environ.get('GOOGLE_CLIENT_ID'))

    db_google_exist = crud.user.get_google_user_by_google_id(
        db=db,
        google_user_id=idinfo.get('sub')
    )
    if db_google_exist is not None:
        raise CustomException(message="The google account is already be binded", code=400)

    crud.user.create_google_user(
        db=db,
        user_id=user.id,
        google_user_id=idinfo.get('sub')
    )

    db.commit()
    return schemas.common.SuccessResponse()

@user_auth_google_router.post('/unbind/google', response_model=schemas.common.NormalResponse)
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
