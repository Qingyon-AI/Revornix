from dotenv import load_dotenv
load_dotenv(override=True)

import crud
import httpx
from jose import jwt
from common.env import is_env_enabled
from data.sql.base import session_scope
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, UNION_PAY_API_PREFIX
from datetime import datetime, timezone
from config.langfuse import LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
from common.logger import exception_logger
from common.subscription_access import get_plan_access_level_from_product_uuid
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

def check_deployed_by_official_in_fuc():
    if is_env_enabled(OFFICIAL):
        return True
    return False

def get_db():
    db = session_scope()
    try:
        yield db
    except Exception as e:
        db.rollback()
        exception_logger.error(f"Error occurred while getting db: {e}")
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
    try:
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f'{UNION_PAY_API_PREFIX}/user/ability/check',
                headers=headers,
                json={
                    "ability": ability
                }
            )
            if not response.is_success:
                exception_logger.warning(
                    f"plan ability check failed: status={response.status_code}, ability={ability}"
                )
                return False
    except Exception as e:
        exception_logger.warning(f"plan ability check request failed: ability={ability}, error={e}")
        return False
    return True


def _parse_plan_start_time(raw):
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


def _extract_user_plan_from_payload(payload: object) -> dict | None:
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
):
    headers = {}
    if authorization:
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"

    try:
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{UNION_PAY_API_PREFIX}/user/info",
                headers=headers,
            )
            if not response.is_success:
                exception_logger.warning(
                    f"Failed to get user plan info. status={response.status_code}"
                )
                return None
            payload = response.json()
            if not isinstance(payload, dict):
                exception_logger.warning("Unexpected user plan response payload type")
                return None
    except Exception as e:
        exception_logger.warning(f"Failed to request user plan info: {e}")
        return None

    return _extract_user_plan_from_payload(payload)


async def get_user_plan_start_time_in_func(
    authorization: str | None,
):
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
):
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
):
    return await get_user_plan_level_in_func(
        authorization=authorization,
    ) > PlanAccessLevel.FREE


async def get_user_compute_balance_in_func(
    authorization: str | None,
):
    headers = {}
    if authorization:
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"

    try:
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{UNION_PAY_API_PREFIX}/user/compute/info",
                headers=headers,
            )
            if not response.is_success:
                exception_logger.warning(
                    f"Failed to get user compute info. status={response.status_code}"
                )
                return 0
            payload = response.json()
            if not isinstance(payload, dict):
                return 0
    except Exception as e:
        exception_logger.warning(f"Failed to request user compute info: {e}")
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
):
    if points <= 0:
        return True

    headers = {}
    if authorization:
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"

    try:
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
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
        exception_logger.warning(f"Failed to consume user compute points: {e}")
        return False
