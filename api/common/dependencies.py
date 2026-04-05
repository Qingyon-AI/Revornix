from dotenv import load_dotenv
load_dotenv(override=True)

import crud
import models
import schemas
import httpx
from datetime import datetime, timezone
from jose import jwt
from redis import Redis
from sqlalchemy.orm import Session
from typing import Any
from data.sql.base import session_scope
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, DEPLOY_HOSTS, UNION_PAY_API_PREFIX
from urllib.parse import urlparse
from fastapi import Request, HTTPException, status, Depends, Header
from config.langfuse import LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
from common.env import is_env_disabled, is_env_enabled
from common.logger import exception_logger, format_log_message
from common.subscription_access import get_plan_access_level_from_product_uuid
from common.timezone import UTC_TIMEZONE_NAME, normalize_timezone_name, timezone_cache_key
from enums.product import PlanAccessLevel
from enums.user import UserRole

if OAUTH_SECRET_KEY is None:
    raise Exception("OAUTH_SECRET_KEY is not set")
if LANGFUSE_PUBLIC_KEY is None or LANGFUSE_SECRET_KEY is None:
    raise Exception("LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is not set")

LANGFUSE_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
LANGFUSE_MAX_RETRIES = 3
LANGFUSE_BASE_BACKOFF_SECONDS = 1.0
LANGFUSE_MAX_BACKOFF_SECONDS = 6.0
    
async def get_request_host(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return urlparse(origin).netloc

    referer = request.headers.get("referer")
    if referer:
        return urlparse(referer).netloc

    return None

async def check_deployed_by_official(
    host = Depends(get_request_host)
):
    # 检查是否是部署在官方的服务
    if host in DEPLOY_HOSTS:
        return True
    if is_env_enabled(OFFICIAL):
        return True
    return False

def check_deployed_by_official_in_fuc():
    if is_env_enabled(OFFICIAL):
        return True
    return False

async def reject_if_official(
    host = Depends(get_request_host)
):
    # 如果不是部署着的服务 则可访问
    if host not in DEPLOY_HOSTS and is_env_disabled(OFFICIAL):
        return True
    raise schemas.error.CustomException(message='This api is only available for local use, and is disabled in the official deployment version', code=403)

def get_db():
    db = session_scope()
    try:
        yield db
    except Exception as e:
        db.rollback()
        exception_logger.error(
            format_log_message("db_session_failed", error=e)
        )
        raise
    finally:
        db.close()

def decode_jwt_token(
    token: str, 
    secret_key: str = OAUTH_SECRET_KEY
):
    return jwt.decode(token, secret_key, algorithms=["HS256"])


def _is_admin_or_root_from_authorization(
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

    db = session_scope()
    try:
        db_user = crud.user.get_user_by_uuid(
            db=db,
            uuid=user_uuid,
        )
        if db_user is None:
            return False
        return db_user.role in (UserRole.ADMIN, UserRole.ROOT)
    except Exception:
        return False
    finally:
        db.close()

def get_cache(request: Request) -> Redis:
    return request.app.state.redis


async def _cache_user_timezone(
    request: Request,
    user_id: int,
    raw_timezone: str | None,
) -> str:
    if raw_timezone is None or not raw_timezone.strip():
        return UTC_TIMEZONE_NAME
    timezone_name = normalize_timezone_name(raw_timezone)
    redis_conn = getattr(request.app.state, "redis", None)
    if redis_conn is None:
        return timezone_name
    try:
        await redis_conn.set(timezone_cache_key(user_id), timezone_name)
    except Exception as e:
        exception_logger.warning(
            format_log_message(
                "user_timezone_cache_failed",
                user_id=user_id,
                timezone=timezone_name,
                error=e,
            )
        )
    return timezone_name


def get_request_timezone(
    x_user_timezone: str | None = Header(default=None),
) -> str:
    return normalize_timezone_name(x_user_timezone)

def get_api_key(
    api_key: str | None = Header(default=None), 
    db: Session = Depends(get_db)
):
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API Key")
    db_api_key = crud.api_key.get_api_key_by_api_key(
        db=db, 
        api_key=api_key
    )
    if db_api_key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")
    return db_api_key

async def get_current_user_with_api_key(
    request: Request,
    api_key: models.api_key.ApiKey = Depends(get_api_key),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(default=None),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    user = crud.user.get_user_by_id(
        db=db,
        user_id=api_key.user_id
    )
    if user is None:
        raise credentials_exception
    if user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are forbidden"
        )
    await _cache_user_timezone(
        request=request,
        user_id=user.id,
        raw_timezone=x_user_timezone,
    )
    return user

def get_real_ip(
    request: Request, 
    x_forwarded_for: str | None = Header(default=None)
) -> str | None:
    if x_forwarded_for:
        # 取第一个IP，因为X-Forwarded-For可能包含多个IP，由逗号分隔
        ip = x_forwarded_for.split(",")[0]
    else:
        if request.client:
            ip = request.client.host
        else:
            ip = None
    return ip

def get_authorization_header(
    authorization: str | None = Header(default=None)
):
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
    return authorization.replace("Bearer ", "")

async def get_current_user_without_throw(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(default=None),
):
    authenticate_value = "Bearer"
    if authorization is None or not authorization.startswith(authenticate_value):
        return None
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, OAUTH_SECRET_KEY, algorithms=['HS256'])
        uuid: str | None = payload.get("sub")
        if uuid is None:
            return None
    except Exception as e:
        exception_logger.warning(
            format_log_message("token_decode_failed", source="optional_auth", error=e)
        )
        return None
    user = crud.user.get_user_by_uuid(
        db=db, 
        uuid=uuid
    )
    if user is None:
        return None
    if user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are forbidden"
        )
    await _cache_user_timezone(
        request=request,
        user_id=user.id,
        raw_timezone=x_user_timezone,
    )
    return user

async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None), 
    db: Session = Depends(get_db),
    x_user_timezone: str | None = Header(default=None),
):
    authenticate_value = "Bearer"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    if authorization is None or not authorization.startswith(authenticate_value):
        raise credentials_exception
    try:
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, OAUTH_SECRET_KEY, algorithms=['HS256'])
        uuid: str | None = payload.get("sub")
        if uuid is None:
            raise credentials_exception
    except Exception as e:
        exception_logger.warning(
            format_log_message("token_decode_failed", source="required_auth", error=e)
        )
        raise credentials_exception
    user = crud.user.get_user_by_uuid(
        db=db, 
        uuid=uuid
    )
    if user is None:
        raise credentials_exception
    if user.is_forbidden:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are forbidden"
        )
    await _cache_user_timezone(
        request=request,
        user_id=user.id,
        raw_timezone=x_user_timezone,
    )
    return user

async def plan_ability_checked_in_func(
    ability: str,
    authorization: str
):
    if _is_admin_or_root_from_authorization(authorization):
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


def _extract_user_plan_from_payload(payload: object) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    user_plan = payload.get("userPlan")
    if user_plan is None:
        user_plan = payload.get("user_plan")

    if not isinstance(user_plan, dict):
        return None
    return user_plan


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
    if _is_admin_or_root_from_authorization(authorization):
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
    

def plan_ability_checked(
    ability: str
):
    async def dependency(
        authorization: str | None = Header(default=None),
        deployed_by_official: bool = Depends(check_deployed_by_official)
    ):
        # 如果不是官方的部署 那么就直接返回True表示该能力可用
        if not deployed_by_official:
            return True
        if _is_admin_or_root_from_authorization(authorization):
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
                err = None
                try:
                    errMsg = response.json().get("message")
                    err = schemas.error.CustomException(
                        message=errMsg, 
                        code=403
                    )
                except Exception as e:
                    errMsg = f"Something is wrong with the ability check service: {e}"
                    err = schemas.error.CustomException(
                        message=errMsg, 
                        code=503
                    )
                raise err
        return True
    return dependency
