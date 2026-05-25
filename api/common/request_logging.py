"""Per-request structured access log shared with the web tier.

Emits one JSON line per HTTP request including the ``Trace-Id`` that flows in
from the web SSR layer (or a freshly generated one). The line shape matches
``web/src/lib/server-timing.ts`` so logs from both tiers can be joined by
``trace_id``.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

from fastapi import Request, Response

from common.logger import info_logger


_LOG_ENABLED = os.environ.get("API_REQUEST_LOG", "on").strip().lower() != "off"
_SLOW_REQUEST_MS = float(os.environ.get("API_SLOW_REQUEST_MS", "500"))


def _current_otel_ids() -> tuple[str | None, str | None]:
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        ctx = span.get_span_context() if span else None
        if ctx is None or not ctx.is_valid:
            return None, None
        return format(ctx.trace_id, "032x"), format(ctx.span_id, "016x")
    except Exception:
        return None, None


def emit_request_log(payload: dict[str, Any]) -> None:
    if not _LOG_ENABLED:
        return
    info_logger.info(json.dumps(payload, ensure_ascii=False, default=str))


def resolve_trace_id(request: Request) -> str:
    return (
        request.headers.get("trace-id")
        or request.headers.get("Trace-Id")
        or uuid.uuid4().hex
    )


def build_request_log(
    *,
    request: Request,
    response: Response | None,
    trace_id: str,
    duration_ms: float,
    error: str | None = None,
) -> dict[str, Any]:
    otel_trace_id, otel_span_id = _current_otel_ids()
    status_code = response.status_code if response is not None else 500
    level = "warn" if status_code >= 500 or duration_ms >= _SLOW_REQUEST_MS else "info"
    payload: dict[str, Any] = {
        "level": level,
        "kind": "api_request",
        "method": request.method,
        "path": request.url.path,
        "trace_id": trace_id,
        "duration_ms": round(duration_ms, 2),
        "status": status_code,
        "client": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "otel_trace_id": otel_trace_id,
        "otel_span_id": otel_span_id,
    }
    if error is not None:
        payload["error"] = error
    return payload
