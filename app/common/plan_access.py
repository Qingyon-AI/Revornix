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
from datetime import datetime
from enums.product import PlanAccessLevel
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


async def get_user_plan_payload_in_func(
    authorization: str | None,
) -> dict[str, Any] | None:
    headers: dict[str, str] = {}
    if authorization:
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{UNION_PAY_API_PREFIX}/user/info",
                headers=headers,
            )
            if not response.is_success:
                exception_logger.warning(
                    format_log_message(
                        "user_plan_info_request_failed",
                        status_code=response.status_code,
                    )
                )
                return None
            payload = response.json()
    except Exception as e:
        exception_logger.warning(
            format_log_message("user_plan_info_request_failed", error=e)
        )
        return None

    return _extract_user_plan_from_payload(payload)


async def get_user_plan_start_time_in_func(
    authorization: str | None,
) -> datetime | None:
    user_plan = await get_user_plan_payload_in_func(
        authorization=authorization,
    )
    if user_plan is None:
        return None

    start_raw = user_plan.get("startTime")
    if start_raw is None:
        start_raw = user_plan.get("start_time")
    return _parse_plan_start_time(start_raw)


async def get_user_plan_level_in_func(
    authorization: str | None,
) -> PlanAccessLevel:
    if await _is_admin_or_root_from_authorization_async(authorization):
        return PlanAccessLevel.MAX

    user_plan = await get_user_plan_payload_in_func(
        authorization=authorization,
    )
    if user_plan is None:
        return PlanAccessLevel.FREE

    expire_time_raw = user_plan.get("expireTime")
    if expire_time_raw is None:
        expire_time_raw = user_plan.get("expire_time")
    expire_time = _parse_plan_start_time(expire_time_raw)
    if expire_time is None or expire_time <= datetime.now(timezone.utc):
        return PlanAccessLevel.FREE

    plan = user_plan.get("plan")
    if not isinstance(plan, dict):
        return PlanAccessLevel.FREE
    product = plan.get("product")
    if not isinstance(product, dict):
        return PlanAccessLevel.FREE

    product_uuid = product.get("uuid")
    if not isinstance(product_uuid, str) or not product_uuid.strip():
        return PlanAccessLevel.FREE
    return get_plan_access_level_from_product_uuid(product_uuid)


async def is_paid_subscription_user_in_func(
    authorization: str | None,
) -> bool:
    return await get_user_plan_level_in_func(
        authorization=authorization,
    ) > PlanAccessLevel.FREE


async def get_user_compute_balance_in_func(
    authorization: str | None,
) -> int:
    headers: dict[str, str] = {}
    if authorization:
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{UNION_PAY_API_PREFIX}/user/compute/info",
                headers=headers,
            )
            if not response.is_success:
                exception_logger.warning(
                    format_log_message(
                        "user_compute_info_request_failed",
                        status_code=response.status_code,
                    )
                )
                return 0
            payload = response.json()
    except Exception as e:
        exception_logger.warning(
            format_log_message("user_compute_info_request_failed", error=e)
        )
        return 0

    if not isinstance(payload, dict):
        return 0
    available_points = payload.get("available_points")
    if isinstance(available_points, (int, float)):
        return max(int(available_points), 0)
    return 0


async def consume_user_compute_points_in_func(
    *,
    authorization: str | None,
    points: int,
    reason: str,
    source: str,
    idempotency_key: str,
) -> bool:
    if points <= 0:
        return True

    headers: dict[str, str] = {}
    if authorization:
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{UNION_PAY_API_PREFIX}/user/compute/consume",
                headers=headers,
                json={
                    "points": int(points),
                    "reason": reason,
                    "source": source,
                    "idempotency_key": idempotency_key,
                },
            )
            return response.is_success
    except Exception as e:
        exception_logger.warning(
            format_log_message("user_compute_consume_request_failed", error=e)
        )
        return False


def _parse_plan_start_time(raw: Any) -> datetime | None:
    if raw is None:
        return None

    if isinstance(raw, datetime):
        if raw.tzinfo is None:
            return raw.replace(tzinfo=timezone.utc)
        return raw.astimezone(timezone.utc)

    if isinstance(raw, (int, float)):
        ts = float(raw)
        if ts > 1_000_000_000_000:
            ts = ts / 1000
        return datetime.fromtimestamp(ts, tz=timezone.utc)

    if isinstance(raw, str):
        value = raw.strip()
        if not value:
            return None
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    return None
