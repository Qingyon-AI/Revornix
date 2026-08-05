from datetime import date as date_type
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from common.logger import exception_logger, format_log_message
from common.redis import redis_pool

USER_TIMEZONE_CACHE_KEY_PREFIX = "user:timezone:"
UTC_TIMEZONE_NAME = "UTC"
CRON_EXPR_TIMEZONE_SEPARATOR = "|tz|"


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
            format_log_message(
                "user_timezone_cache_read_failed",
                user_id=user_id,
                error=e,
            )
        )
        return UTC_TIMEZONE_NAME
    finally:
        if redis_conn is not None:
            await redis_conn.aclose()


def today_in_timezone(timezone_name: str | None) -> date_type:
    normalized_timezone = normalize_timezone_name(timezone_name)
    now_utc = datetime.now(timezone.utc)
    return now_utc.astimezone(ZoneInfo(normalized_timezone)).date()


def encode_cron_expr_with_timezone(
    *,
    cron_expr: str,
    timezone_name: str | None,
) -> str:
    normalized_timezone = normalize_timezone_name(timezone_name)
    return f"{normalized_timezone}{CRON_EXPR_TIMEZONE_SEPARATOR}{cron_expr}"


def decode_cron_expr_with_timezone(
    stored_cron_expr: str | None,
) -> tuple[str, str | None]:
    if not stored_cron_expr:
        return UTC_TIMEZONE_NAME, None

    if CRON_EXPR_TIMEZONE_SEPARATOR not in stored_cron_expr:
        # Backward compatibility for old data that only stored cron expression.
        return UTC_TIMEZONE_NAME, stored_cron_expr

    timezone_name, cron_expr = stored_cron_expr.split(
        CRON_EXPR_TIMEZONE_SEPARATOR,
        1,
    )
    normalized_timezone = normalize_timezone_name(timezone_name)
    if not cron_expr:
        return normalized_timezone, None
    return normalized_timezone, cron_expr
