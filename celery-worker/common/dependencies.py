from dotenv import load_dotenv
load_dotenv(override=True)

import httpx
import asyncio
from jose import jwt
from collections import defaultdict
from typing import Any
from data.sql.base import session_scope
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, UNION_PAY_URL_PREFIX
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from config.langfuse import LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
from common.logger import exception_logger

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

async def plan_ability_checked_in_func(
    ability: str,
    authorization: str
):
    headers = { }
    if authorization is not None:
        headers.update({
            'Authorization': f'{authorization}'
        })
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f'{UNION_PAY_URL_PREFIX}/user/ability/check',
            headers=headers,
            json={
                "ability": ability
            }
        )
        if not response.is_success:
            return False
    return True

async def list_traces(
    model_name: str,
    user_id: int,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int | None = None,
):
    """
    查询指定用户在指定时间范围内的 Langfuse traces
    时间必须是 UTC（tz-aware）
    """

    if LANGFUSE_PUBLIC_KEY is None or LANGFUSE_SECRET_KEY is None:
        raise RuntimeError("Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY")

    # 兜底时间（最近 24h）
    if end_time is None:
        end_time = datetime.now(timezone.utc)
    if start_time is None:
        start_time = end_time - timedelta(days=1)

    # 🚨 强制 UTC
    if start_time.tzinfo is None or end_time.tzinfo is None:
        raise ValueError("start_time / end_time must be timezone-aware (UTC)")

    params: dict[str, str | int] = {
        "userId": str(user_id),
        "fromTimestamp": start_time.isoformat(),
        "toTimestamp": end_time.isoformat(),
        "orderBy": "timestamp.desc",
        # 👇 如果你是用 tag 记录 model（推荐）
        "tags": f"model:{model_name}",
    }
    
    if limit is not None:
        params.update(
            {
                "limit": limit
            }
        )

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await _langfuse_get_with_retry(
            client,
            f"{LANGFUSE_BASE_URL}/api/public/traces",
            params=params,
        )

    return resp.json()["data"]

def _parse_retry_after_seconds(raw_retry_after: str | None) -> float | None:
    if not raw_retry_after:
        return None

    try:
        return max(float(raw_retry_after), 0.0)
    except ValueError:
        pass

    try:
        retry_at = parsedate_to_datetime(raw_retry_after)
    except (TypeError, ValueError):
        return None

    if retry_at.tzinfo is None:
        retry_at = retry_at.replace(tzinfo=timezone.utc)
    return max((retry_at - datetime.now(timezone.utc)).total_seconds(), 0.0)

def _get_backoff_seconds(response: httpx.Response | None, attempt: int) -> float:
    retry_after_seconds = _parse_retry_after_seconds(
        response.headers.get("Retry-After") if response is not None else None
    )
    if retry_after_seconds is not None:
        return min(retry_after_seconds, LANGFUSE_MAX_BACKOFF_SECONDS)
    return min(
        LANGFUSE_BASE_BACKOFF_SECONDS * (2 ** (attempt - 1)),
        LANGFUSE_MAX_BACKOFF_SECONDS,
    )

async def _langfuse_get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    params: dict[str, str | int] | None = None,
) -> httpx.Response:
    for attempt in range(1, LANGFUSE_MAX_RETRIES + 1):
        try:
            response = await client.get(
                url,
                auth=(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY),
                params=params,
            )
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code if e.response is not None else None
            can_retry = (
                status_code in LANGFUSE_RETRYABLE_STATUS_CODES
                and attempt < LANGFUSE_MAX_RETRIES
            )
            if not can_retry:
                raise
            wait_seconds = _get_backoff_seconds(e.response, attempt)
            exception_logger.warning(
                f"Langfuse request failed with status {status_code}, retrying in {wait_seconds:.1f}s. url={url}, attempt={attempt}"
            )
            await asyncio.sleep(wait_seconds)
        except (httpx.TimeoutException, httpx.TransportError) as e:
            if attempt >= LANGFUSE_MAX_RETRIES:
                raise
            wait_seconds = _get_backoff_seconds(None, attempt)
            exception_logger.warning(
                f"Langfuse request transport error, retrying in {wait_seconds:.1f}s. url={url}, attempt={attempt}, error={e}"
            )
            await asyncio.sleep(wait_seconds)

    raise RuntimeError("Langfuse retry loop exhausted without response")

def is_leaf_generation(obs, all_obs):
    return not any(
        child.get("parentObservationId") == obs.get("id")
        and child.get("type") == "GENERATION"
        for child in all_obs
    )
    
def sum_usage_details(items: list[dict[str, Any]]) -> dict[str, int]:
    total: dict[str, int] = defaultdict(int)

    for item in items:
        usage = item.get("usageDetails")
        if not usage:
            continue

        for key, value in usage.items():
            if isinstance(value, int):
                total[key] += value

    return dict(total)