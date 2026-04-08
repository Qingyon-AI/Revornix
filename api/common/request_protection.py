from __future__ import annotations

import hashlib
import math
import os
import re
import time
from dataclasses import dataclass

import schemas
from common.logger import format_log_message, warning_logger
from redis.asyncio import Redis
from starlette.requests import Request

SUSPICIOUS_USER_AGENT_PATTERNS = (
    re.compile(r"^$"),
    re.compile(r"python-requests", re.IGNORECASE),
    re.compile(r"python-httpx", re.IGNORECASE),
    re.compile(r"aiohttp", re.IGNORECASE),
    re.compile(r"curl", re.IGNORECASE),
    re.compile(r"wget", re.IGNORECASE),
    re.compile(r"go-http-client", re.IGNORECASE),
    re.compile(r"scrapy", re.IGNORECASE),
    re.compile(r"headless", re.IGNORECASE),
    re.compile(r"phantomjs", re.IGNORECASE),
    re.compile(r"selenium", re.IGNORECASE),
    re.compile(r"playwright", re.IGNORECASE),
)

EXEMPT_PATHS = {
    "/health",
}


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    limit: int
    window_seconds: int
    key_mode: str = "ip"


@dataclass(frozen=True)
class RequestProtectionPolicy:
    name: str
    rules: tuple[RateLimitRule, ...]
    block_suspicious_user_agent: bool = False


@dataclass(frozen=True)
class RateLimitState:
    allowed: bool
    policy_name: str
    rule_name: str
    limit: int
    tokens: float
    remaining: int
    reset_after_seconds: int


def _env_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    try:
        return max(int(value), 1)
    except ValueError:
        return default


SMS_CODE_POLICY = RequestProtectionPolicy(
    name="sms_code",
    block_suspicious_user_agent=True,
    rules=(
        RateLimitRule(
            name="ip_short",
            limit=_env_int("ANTI_SCRAPE_SMS_IP_LIMIT", 3),
            window_seconds=_env_int("ANTI_SCRAPE_SMS_IP_WINDOW_SECONDS", 600),
            key_mode="ip",
        ),
        RateLimitRule(
            name="ip_ua_burst",
            limit=_env_int("ANTI_SCRAPE_SMS_IP_UA_LIMIT", 2),
            window_seconds=_env_int("ANTI_SCRAPE_SMS_IP_UA_WINDOW_SECONDS", 60),
            key_mode="ip_ua",
        ),
    ),
)

PUBLIC_SEARCH_POLICY = RequestProtectionPolicy(
    name="public_search",
    block_suspicious_user_agent=True,
    rules=(
        RateLimitRule(
            name="ip_short",
            limit=_env_int("ANTI_SCRAPE_PUBLIC_IP_LIMIT", 120),
            window_seconds=_env_int("ANTI_SCRAPE_PUBLIC_IP_WINDOW_SECONDS", 300),
            key_mode="ip",
        ),
        RateLimitRule(
            name="ip_ua_burst",
            limit=_env_int("ANTI_SCRAPE_PUBLIC_IP_UA_LIMIT", 30),
            window_seconds=_env_int("ANTI_SCRAPE_PUBLIC_IP_UA_WINDOW_SECONDS", 60),
            key_mode="ip_ua",
        ),
    ),
)

ANONYMOUS_DETAIL_POLICY = RequestProtectionPolicy(
    name="anonymous_detail",
    block_suspicious_user_agent=True,
    rules=(
        RateLimitRule(
            name="ip_short",
            limit=_env_int("ANTI_SCRAPE_ANON_DETAIL_IP_LIMIT", 90),
            window_seconds=_env_int("ANTI_SCRAPE_ANON_DETAIL_IP_WINDOW_SECONDS", 300),
            key_mode="ip",
        ),
        RateLimitRule(
            name="ip_ua_burst",
            limit=_env_int("ANTI_SCRAPE_ANON_DETAIL_IP_UA_LIMIT", 20),
            window_seconds=_env_int("ANTI_SCRAPE_ANON_DETAIL_IP_UA_WINDOW_SECONDS", 60),
            key_mode="ip_ua",
        ),
    ),
)

OPENAPI_POLICY = RequestProtectionPolicy(
    name="openapi",
    block_suspicious_user_agent=True,
    rules=(
        RateLimitRule(
            name="ip_short",
            limit=_env_int("ANTI_SCRAPE_OPENAPI_IP_LIMIT", 5),
            window_seconds=_env_int("ANTI_SCRAPE_OPENAPI_IP_WINDOW_SECONDS", 60),
            key_mode="ip",
        ),
    ),
)

TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_window = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])
local ttl_ms = tonumber(ARGV[5])

local refill_rate = capacity / refill_window
local state = redis.call("HMGET", key, "tokens", "updated_at")
local tokens = tonumber(state[1])
local updated_at = tonumber(state[2])

if tokens == nil then
    tokens = capacity
    updated_at = now_ms
end

if now_ms > updated_at then
    local elapsed = now_ms - updated_at
    tokens = math.min(capacity, tokens + (elapsed * refill_rate))
    updated_at = now_ms
end

local allowed = 0
if tokens >= requested then
    tokens = tokens - requested
    allowed = 1
end

redis.call("HSET", key, "tokens", tokens, "updated_at", updated_at)
redis.call("PEXPIRE", key, ttl_ms)

return {allowed, tokens}
"""

def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _get_user_agent(request: Request) -> str:
    return request.headers.get("user-agent", "").strip()


def _is_authenticated(request: Request) -> bool:
    authorization = request.headers.get("authorization", "").strip()
    api_key = request.headers.get("api-key", "").strip() or request.headers.get("api_key", "").strip()
    return bool(authorization or api_key)


def _is_suspicious_user_agent(user_agent: str) -> bool:
    return any(pattern.search(user_agent) for pattern in SUSPICIOUS_USER_AGENT_PATTERNS)


def _build_identity_fragment(*, request: Request, key_mode: str) -> str:
    ip = _get_client_ip(request)
    if key_mode == "ip":
        return ip
    if key_mode == "ip_ua":
        user_agent = _get_user_agent(request)
        user_agent_hash = hashlib.sha256(user_agent.encode("utf-8")).hexdigest()[:16]
        return f"{ip}:{user_agent_hash}"
    raise ValueError(f"Unsupported key mode: {key_mode}")


def _get_policy(request: Request) -> RequestProtectionPolicy | None:
    path = request.url.path
    if path in EXEMPT_PATHS:
        return None

    if path in {"/openapi.json", "/openapi.yaml"}:
        return OPENAPI_POLICY

    if path.startswith("/user/create/sms/"):
        return SMS_CODE_POLICY

    if path in {"/section/public/search", "/section/detail/seo"}:
        return PUBLIC_SEARCH_POLICY

    if not _is_authenticated(request) and path in {"/document/detail", "/section/detail"}:
        return ANONYMOUS_DETAIL_POLICY

    return None


def _should_log_near_limit(state: RateLimitState) -> bool:
    threshold = max(1, min(10, state.limit // 10))
    return state.remaining == threshold


def _log_anti_scrape_event(
    *,
    event: str,
    request: Request,
    policy_name: str,
    rule_name: str | None,
    state: RateLimitState | None,
    user_agent: str,
) -> None:
    warning_logger.warning(
        format_log_message(
            f"anti_scrape_{event}",
            method=request.method,
            path=request.url.path,
            client_ip=_get_client_ip(request),
            host=request.headers.get("host"),
            policy=policy_name,
            rule=rule_name,
            limit=state.limit if state is not None else None,
            remaining=state.remaining if state is not None else None,
            reset_after_seconds=state.reset_after_seconds if state is not None else None,
            ua_hash=hashlib.sha256(user_agent.encode("utf-8")).hexdigest()[:16] if user_agent else None,
            authenticated=_is_authenticated(request),
        )
    )


async def _consume_rate_limit(
    *,
    redis_conn: Redis,
    request: Request,
    policy: RequestProtectionPolicy,
    rule: RateLimitRule,
) -> RateLimitState:
    identity = _build_identity_fragment(request=request, key_mode=rule.key_mode)
    key = f"anti-scrape:{policy.name}:{rule.name}:{request.method}:{request.url.path}:{identity}"
    now_ms = int(time.time() * 1000)
    ttl_ms = max(rule.window_seconds * 2000, 60_000)
    allowed_raw, tokens_raw = await redis_conn.eval(
        TOKEN_BUCKET_LUA,
        1,
        key,
        rule.limit,
        rule.window_seconds,
        now_ms,
        1,
        ttl_ms,
    )
    allowed = int(allowed_raw) == 1
    tokens = max(float(tokens_raw), 0.0)
    remaining = max(int(tokens), 0)
    refill_rate = rule.limit / rule.window_seconds
    if allowed:
        reset_after_seconds = 0
    else:
        missing_tokens = max(1.0 - tokens, 0.0)
        reset_after_seconds = max(int(math.ceil(missing_tokens / refill_rate)), 1)
    return RateLimitState(
        allowed=allowed,
        policy_name=policy.name,
        rule_name=rule.name,
        limit=rule.limit,
        tokens=tokens,
        remaining=remaining,
        reset_after_seconds=reset_after_seconds,
    )


async def protect_request(request: Request) -> RateLimitState | None:
    policy = _get_policy(request)
    if policy is None:
        return None

    user_agent = _get_user_agent(request)
    if policy.block_suspicious_user_agent and _is_suspicious_user_agent(user_agent):
        _log_anti_scrape_event(
            event="blocked_user_agent",
            request=request,
            policy_name=policy.name,
            rule_name=None,
            state=None,
            user_agent=user_agent,
        )
        raise schemas.error.CustomException(
            message="Request rejected by anti-scraping policy",
            code=403,
        )

    redis_conn = getattr(request.app.state, "redis", None)
    if redis_conn is None:
        return None

    most_restrictive_state: RateLimitState | None = None
    for rule in policy.rules:
        state = await _consume_rate_limit(
            redis_conn=redis_conn,
            request=request,
            policy=policy,
            rule=rule,
        )
        if most_restrictive_state is None or state.remaining < most_restrictive_state.remaining:
            most_restrictive_state = state
        if state.allowed and _should_log_near_limit(state):
            _log_anti_scrape_event(
                event="near_limit",
                request=request,
                policy_name=state.policy_name,
                rule_name=state.rule_name,
                state=state,
                user_agent=user_agent,
            )
        if not state.allowed:
            retry_after_seconds = max(state.reset_after_seconds, 1)
            _log_anti_scrape_event(
                event="rate_limited",
                request=request,
                policy_name=state.policy_name,
                rule_name=state.rule_name,
                state=state,
                user_agent=user_agent,
            )
            raise schemas.error.CustomException(
                message=(
                    "Too many requests. Please slow down and try again later. "
                    f"Retry after about {math.ceil(retry_after_seconds)} seconds."
                ),
                code=429,
            )

    return most_restrictive_state
