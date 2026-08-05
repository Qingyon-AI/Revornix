"""不依赖 FastAPI 的套餐/权限判定。

从 `common/dependencies.py` 拆出来的。那个文件同时装着两类东西：FastAPI 的
请求依赖（`Depends(...)` 那一套，只有 api 用）和这几个 `*_in_func` 纯函数
（工作流在任务里调）。合并 api 与 worker 的代码之后，两者混在一起意味着
**worker 也得装 fastapi 才能启动** —— 而它的 requirements 里没有 fastapi，
线上会直接起不来。

所以按"要不要 FastAPI"切开：这里一个 fastapi 都不 import。
"""

from __future__ import annotations

import os

import httpx

from common.env import is_env_enabled
from common.logger import exception_logger
from config.base import OFFICIAL, UNION_PAY_API_PREFIX
from data.sql.base import async_session_context
from enums.user import UserRole
import crud


async def _is_admin_or_root_from_authorization_async(
    authorization: str | None,
) -> bool:
    if not authorization:
        return False

    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1)

    try:
        payload = decode_jwt_token(token=token)
        user_uuid = payload.get("sub")
        if not user_uuid:
            return False
    except Exception:
        return False

    async with async_session_context() as db:
        try:
            db_user = await crud.user.get_user_by_uuid_async(
                db=db,
                uuid=user_uuid,
            )
            if db_user is None:
                return False
            try:
                _reject_if_stale_auth_epoch(payload=payload, user=db_user)
            except HTTPException:
                return False
            return db_user.role in (UserRole.ADMIN, UserRole.ROOT)
        except Exception:
            return False

def check_deployed_by_official_in_fuc():
    if is_env_enabled(OFFICIAL):
        return True
    return False

async def plan_ability_checked_in_func(
    ability: str,
    authorization: str
):
    if await _is_admin_or_root_from_authorization_async(authorization):
        return True

    headers = { }
    if authorization is not None:
        headers.update({
            'Authorization': f'{authorization}'
        })
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f'{UNION_PAY_API_PREFIX}/user/ability/check',
            headers=headers,
            json={
                "ability": ability
            }
        )
        if not response.is_success:
            return False
    return True
