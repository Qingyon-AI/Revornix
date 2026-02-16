from dotenv import load_dotenv
load_dotenv(override=True)

import crud
import models
import schemas
import httpx
import asyncio
from jose import jwt
from redis import Redis
from collections import defaultdict
from typing import Any
from sqlalchemy.orm import Session
from data.sql.base import session_scope
from config.oauth2 import OAUTH_SECRET_KEY
from config.base import OFFICIAL, DEPLOY_HOSTS, UNION_PAY_URL_PREFIX
from urllib.parse import urlparse
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from fastapi import Request, HTTPException, status, Depends, Header
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
    if OFFICIAL == 'True':
        return True
    return False

def check_deployed_by_official_in_fuc():
    if OFFICIAL == 'True':
        return True
    return False

async def reject_if_official(
    host = Depends(get_request_host)
):
    # 如果不是部署着的服务 则可访问
    if host not in DEPLOY_HOSTS and OFFICIAL == 'False':
        return True
    raise schemas.error.CustomException(message='This api is only available for local use, and is disabled in the official deployment version', code=403)

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

def get_cache(request: Request) -> Redis:
    return request.app.state.redis

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

def get_current_user_with_api_key(
    api_key: models.api_key.ApiKey = Depends(get_api_key),
    db: Session = Depends(get_db)
):
     user = crud.user.get_user_by_id(
         db=db, 
         user_id=api_key.user_id
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

def get_current_user_without_throw(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
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
        exception_logger.error(f"Error occurred while decoding token: {e}")
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
    return user

def get_current_user(
    authorization: str | None = Header(default=None), 
    db: Session = Depends(get_db)
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
        exception_logger.error(f"Error occurred while decoding token: {e}")
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
    return user

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

async def calc_token_usage(
    trace_ids: list[str]
):

    if LANGFUSE_PUBLIC_KEY is None or LANGFUSE_SECRET_KEY is None:
        raise RuntimeError("Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY")

    to_be_sumed = []

    async with httpx.AsyncClient(
        timeout=20
    ) as client:
        for trace_id in trace_ids:
            resp = await client.get(
                f"{LANGFUSE_BASE_URL}/api/public/traces/{trace_id}",
                auth=(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY),
            )
            resp.raise_for_status()
            detail = resp.json()
            observations = detail.get("observations", [])
            for obs in observations:
                if (
                    obs["type"] == "GENERATION"
                    and obs.get("usageDetails")
                    and is_leaf_generation(obs, observations)
                ):
                    to_be_sumed.append(obs)

    return sum_usage_details(to_be_sumed)

async def get_user_token_usage(
    *,
    user_id: int,
    model_name: str,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int | None = None,
):
    traces = await list_traces(
        model_name=model_name,
        user_id=user_id,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )

    trace_ids = [t["id"] for t in traces]

    if not trace_ids:
        return None

    usage = await calc_token_usage(trace_ids)
    usage["trace_count"] = len(trace_ids)

    return usage

if __name__=='__main__':

    import asyncio

    async def main():
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=7)
        res = await get_user_token_usage(
            user_id=1,
            model_name="gpt-audio",
            start_time=start_time,
            end_time=end_time,
        )
        print(res)
    asyncio.run(
        main()
    )
