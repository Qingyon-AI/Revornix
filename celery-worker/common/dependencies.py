from dotenv import load_dotenv
load_dotenv(override=True)

import crud
import httpx
from jose import jwt
from data.sql.base import session_scope
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, UNION_PAY_URL_PREFIX
from datetime import datetime, timezone
from config.langfuse import LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
from common.logger import exception_logger
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
    if OFFICIAL == 'True':
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
                f'{UNION_PAY_URL_PREFIX}/user/ability/check',
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


async def get_user_plan_start_time_in_func(
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
                f"{UNION_PAY_URL_PREFIX}/user/info",
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

    user_plan = None
    user_plan = payload.get("userPlan")
    if user_plan is None:
        user_plan = payload.get("user_plan")

    if not isinstance(user_plan, dict):
        return None

    start_raw = user_plan.get("startTime")
    if start_raw is None:
        start_raw = user_plan.get("start_time")
    return _parse_plan_start_time(start_raw)
