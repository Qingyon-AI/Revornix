from datetime import date as date_type
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from common.logger import exception_logger
from common.redis import redis_pool

USER_TIMEZONE_CACHE_KEY_PREFIX = "user:timezone:"
UTC_TIMEZONE_NAME = "UTC"


def normalize_timezone_name(raw_timezone: str | None) -> str:
    if not raw_timezone:
        return UTC_TIMEZONE_NAME
    try:
        ZoneInfo(raw_timezone)
        return raw_timezone
    except ZoneInfoNotFoundError:
        return UTC_TIMEZONE_NAME


def timezone_cache_key(user_id: int) -> str:
    return f"{USER_TIMEZONE_CACHE_KEY_PREFIX}{user_id}"


async def get_cached_user_timezone(user_id: int) -> str:
    redis_conn = None
    try:
        redis_conn = await redis_pool()
        cached_timezone = await redis_conn.get(timezone_cache_key(user_id))
        return normalize_timezone_name(cached_timezone)
    except Exception as e:
        exception_logger.warning(
            f"Failed to get cached timezone for user_id={user_id}: {e}"
        )
        return UTC_TIMEZONE_NAME
    finally:
        if redis_conn is not None:
            await redis_conn.aclose()


def today_in_timezone(timezone_name: str | None) -> date_type:
    normalized_timezone = normalize_timezone_name(timezone_name)
    now_utc = datetime.now(timezone.utc)
    return now_utc.astimezone(ZoneInfo(normalized_timezone)).date()
