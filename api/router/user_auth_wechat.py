import os
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user, get_current_user_short_lived, get_real_ip
from common.jwt_utils import create_token
from common.tp_auth.wechat_utils import get_mini_wechat_tokens, get_web_user_info, get_web_wechat_tokens
from enums.user import WeChatUserSource
from file.built_in_remote_file_service import BuiltInRemoteFileService
from data.sql.base import async_session_context
from router.user_shared import commit_with_bucket_cleanup_async, setup_default_file_system_for_user_async
from schemas.error import CustomException

user_auth_wechat_router = APIRouter()

@user_auth_wechat_router.post('/create/wechat/mini', response_model=schemas.user.TokenResponse)
async def create_user_by_wechat_mini(
    wechat_mini_user_create_request: schemas.user.WeChatMiniUserCreateRequest,
    ip: str | None = Depends(get_real_ip)
):
    WECHAT_MINI_APP_ID = os.environ.get('WECHAT_MINI_APP_ID')
    WECHAT_MINI_APP_SECRET = os.environ.get('WECHAT_MINI_APP_SECRET')
    if WECHAT_MINI_APP_ID is None or WECHAT_MINI_APP_SECRET is None:
        raise CustomException('WeChat Mini Program login is not configured', 500)

    code = wechat_mini_user_create_request.code
    response_tokens = await get_mini_wechat_tokens(WECHAT_MINI_APP_ID, WECHAT_MINI_APP_SECRET, code)
    openid = response_tokens.openid
    union_id = response_tokens.unionid
    if openid is None or union_id is None:
        raise CustomException('WeChat login failed', 403)

    # 如果openid都已经存在了 那就说明这个用户在这个平台已经注册过了 直接返回token
    async with async_session_context() as db:
        db_exist_wechat_user_by_open_id = await crud.user.get_wechat_user_by_wechat_open_id_async(
            db=db,
            wechat_user_open_id=openid,
            filter_wechat_platform=WeChatUserSource.REVORNIX_MINI_PROGRAM
        )
        if db_exist_wechat_user_by_open_id is not None:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=db_exist_wechat_user_by_open_id.user_id
            )
            access_token, refresh_token = create_token(db_user)
            return schemas.user.TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=3600
            )

        db_exist_wechat_user_by_union_id = await crud.user.get_wechat_user_by_wechat_union_id_async(
            db=db,
            wechat_user_union_id=union_id
        )
        bucket_file_service: BuiltInRemoteFileService | None = None

        if len(db_exist_wechat_user_by_union_id) == 0:
            nickname = f'Revornix User {uuid4().hex[:8]}'
            db_user = await crud.user.create_base_user_async(
                db=db,
                avatar="files/default_avatar.png",
                nickname=nickname
            )
            db_user.last_login_ip = ip
            db_user.last_login_time = datetime.now(timezone.utc)

            await crud.user.create_wechat_user_async(
                db=db,
                user_id=db_user.id,
                wechat_platform=WeChatUserSource.REVORNIX_MINI_PROGRAM,
                wechat_user_open_id=openid,
                wechat_user_union_id=union_id,
                wechat_user_name=nickname
            )
            bucket_file_service = await setup_default_file_system_for_user_async(
                db=db,
                db_user=db_user,
            )
        else:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=db_exist_wechat_user_by_union_id[0].user_id
            )
            if db_user is None:
                raise CustomException('WeChat user record exists, but the linked user was not found', 404)
            await crud.user.create_wechat_user_async(
                db=db,
                user_id=db_user.id,
                wechat_platform=WeChatUserSource.REVORNIX_MINI_PROGRAM,
                wechat_user_open_id=openid,
                wechat_user_union_id=union_id,
                wechat_user_name=db_user.nickname
            )
        await commit_with_bucket_cleanup_async(db=db, file_service=bucket_file_service)
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )

@user_auth_wechat_router.post("/create/wechat/web", response_model=schemas.user.TokenResponse)
async def create_user_by_wechat_web(
    wechat_web_user_create_request: schemas.user.WeChatWebUserCreateRequest,
    ip: str | None = Depends(get_real_ip)
):
    WECHAT_WEB_APP_ID = os.environ.get('WECHAT_WEB_APP_ID')
    WECHAT_WEB_APP_SECRET = os.environ.get('WECHAT_WEB_APP_SECRET')
    if WECHAT_WEB_APP_ID is None or WECHAT_WEB_APP_SECRET is None:
        raise CustomException('WeChat Web login is not configured', 500)

    code = wechat_web_user_create_request.code
    response_tokens = await get_web_wechat_tokens(WECHAT_WEB_APP_ID, WECHAT_WEB_APP_SECRET, code)
    access_token = response_tokens.access_token

    openid = response_tokens.openid
    union_id = response_tokens.unionid
    if access_token is None or openid is None or union_id is None:
        raise CustomException('WeChat login failed', 403)

    async with async_session_context() as db:
        db_exist_wechat_user_by_openid = await crud.user.get_wechat_user_by_wechat_open_id_async(
            db=db,
            wechat_user_open_id=openid,
            filter_wechat_platform=WeChatUserSource.REVORNIX_WEB_APP
        )
        if db_exist_wechat_user_by_openid is not None:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=db_exist_wechat_user_by_openid.user_id
            )
            access_token, refresh_token = create_token(db_user)
            return schemas.user.TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=3600)

        db_exist_wechat_user_by_union_id = await crud.user.get_wechat_user_by_wechat_union_id_async(
            db=db,
            wechat_user_union_id=union_id
        )
        bucket_file_service: BuiltInRemoteFileService | None = None
        if len(db_exist_wechat_user_by_union_id) == 0:
            response_user_info = await get_web_user_info(
                access_token=access_token,
                openid=openid,
            )
            nickname = response_user_info.get('nickname')
            db_user = await crud.user.create_base_user_async(
                db=db,
                avatar="files/default_avatar.png",
                nickname=nickname
            )
            db_user.last_login_ip = ip
            db_user.last_login_time = datetime.now(timezone.utc)

            await crud.user.create_wechat_user_async(
                db=db,
                user_id=db_user.id,
                wechat_platform=WeChatUserSource.REVORNIX_WEB_APP,
                wechat_user_open_id=openid,
                wechat_user_union_id=union_id,
                wechat_user_name=nickname
            )
            bucket_file_service = await setup_default_file_system_for_user_async(
                db=db,
                db_user=db_user,
            )
        else:
            db_user = await crud.user.get_user_by_id_async(
                db=db,
                user_id=db_exist_wechat_user_by_union_id[0].user_id
            )
            if db_user is None:
                raise CustomException('WeChat user record exists, but the linked user was not found', 404)
            await crud.user.create_wechat_user_async(
                db=db,
                user_id=db_user.id,
                wechat_platform=WeChatUserSource.REVORNIX_WEB_APP,
                wechat_user_open_id=openid,
                wechat_user_union_id=union_id,
                wechat_user_name=db_user.nickname
            )
        await commit_with_bucket_cleanup_async(db=db, file_service=bucket_file_service)
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600
        )

@user_auth_wechat_router.post("/bind/wechat/web", response_model=schemas.common.NormalResponse)
async def bind_wechat(
    wechat_user_bind_request: schemas.user.WeChatWebUserBindRequest,
    user: models.user.User = Depends(get_current_user_short_lived),
):
    WECHAT_WEB_APP_ID = os.environ.get('WECHAT_WEB_APP_ID')
    WECHAT_WEB_APP_SECRET = os.environ.get('WECHAT_WEB_APP_SECRET')
    if WECHAT_WEB_APP_ID is None or WECHAT_WEB_APP_SECRET is None:
        raise CustomException('WeChat Web login is not configured', 500)
    code = wechat_user_bind_request.code
    response_tokens = await get_web_wechat_tokens(WECHAT_WEB_APP_ID, WECHAT_WEB_APP_SECRET, code)
    access_token = response_tokens.access_token
    openid = response_tokens.openid
    if access_token is None or openid is None:
        raise CustomException(message='WeChat login failed', code=400)
    union_id = response_tokens.unionid
    response_user_info = await get_web_user_info(access_token, openid)
    nickname = response_user_info.get('nickname')
    async with async_session_context() as db:
        db_wechat_user_exist = await crud.user.get_wechat_user_by_user_id_async(
            db=db,
            user_id=user.id,
            filter_wechat_platform=WeChatUserSource.REVORNIX_WEB_APP
        )
        if len(db_wechat_user_exist) > 0:
            raise CustomException(message="A WeChat Web account is already bound to this user", code=403)
        db_wechat_exist = await crud.user.get_wechat_user_by_wechat_open_id_async(
            db=db,
            wechat_user_open_id=openid,
            filter_wechat_platform=WeChatUserSource.REVORNIX_WEB_APP
        )
        if db_wechat_exist is not None:
            raise CustomException(message="This WeChat account is already bound to another user", code=400)
        await crud.user.create_wechat_user_async(
            db=db,
            user_id=user.id,
            wechat_platform=WeChatUserSource.REVORNIX_WEB_APP,
            wechat_user_open_id=openid,
            wechat_user_union_id=union_id,
            wechat_user_name=nickname
        )
        await db.commit()
        return schemas.common.SuccessResponse()

@user_auth_wechat_router.post('/unbind/wechat', response_model=schemas.common.NormalResponse)
async def unbind_wechat(
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    await crud.user.delete_wechat_user_by_user_id_async(
        db=db,
        user_id=user.id
    )
    await db.commit()
    return schemas.common.SuccessResponse()
