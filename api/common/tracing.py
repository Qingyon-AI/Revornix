"""OpenTelemetry bootstrap for the FastAPI backend.

Call ``setup_tracing(app)`` once during app construction. The function is a
no-op when ``OTEL_SDK_DISABLED=true`` or when the OTel packages are missing
(useful for minimal environments / tests).

Spans created by FastAPI/SQLAlchemy/httpx/redis automatically flow through the
configured tracer provider and exporter. The downstream Trace-Id header sent
by the web tier is honoured via the W3C ``traceparent`` propagator (handled by
``opentelemetry-instrumentation-fastapi``).
"""
from __future__ import annotations

import os
from typing import Any

from common.logger import exception_logger, format_log_message, info_logger


_TRACING_INITIALIZED = False


def sentry_before_send_attach_otel(event: Any, hint: Any) -> Any:
    """Sentry ``before_send`` hook that stamps the current OTel trace context
    onto the outgoing event.

    Result: every Sentry issue page shows ``otel.trace_id`` / ``otel.span_id``
    tags, which click through to the matching Jaeger trace.
    """
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        ctx = span.get_span_context() if span else None
        if ctx is None or not ctx.is_valid:
            return event
        trace_id = format(ctx.trace_id, "032x")
        span_id = format(ctx.span_id, "016x")
        tags = event.setdefault("tags", {})
        if isinstance(tags, dict):
            tags.setdefault("otel.trace_id", trace_id)
            tags.setdefault("otel.span_id", span_id)
        contexts = event.setdefault("contexts", {})
        if isinstance(contexts, dict):
            contexts.setdefault(
                "otel",
                {"trace_id": trace_id, "span_id": span_id},
            )
    except Exception:
        # Observability code must never break the request path.
        pass
    return event


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def setup_tracing(app: Any) -> None:
    global _TRACING_INITIALIZED
    if _TRACING_INITIALIZED:
        return

    if _bool_env("OTEL_SDK_DISABLED"):
        info_logger.info(
            format_log_message("otel_tracing_disabled", reason="OTEL_SDK_DISABLED")
        )
        _TRACING_INITIALIZED = True
        return

    try:
        import logging as _stdlib_logging

        from opentelemetry import trace
        from opentelemetry._logs import set_logger_provider
        from opentelemetry.exporter.otlp.proto.http._log_exporter import (
            OTLPLogExporter,
        )
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.instrumentation.logging import LoggingInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError as exc:  # pragma: no cover
        exception_logger.warning(
            format_log_message("otel_packages_missing", error=str(exc))
        )
        _TRACING_INITIALIZED = True
        return

    service_name = os.environ.get("OTEL_SERVICE_NAME", "revornix-api")
    endpoint = os.environ.get(
        "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"
    )
    traces_endpoint = (
        os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
        or f"{endpoint.rstrip('/')}/v1/traces"
    )
    logs_endpoint = (
        os.environ.get("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT")
        or f"{endpoint.rstrip('/')}/v1/logs"
    )

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "revornix",
            "deployment.environment": os.environ.get(
                "DEPLOYMENT_ENV", "local"
            ),
        }
    )

    # Some third-party packages (notably ``mcp_use``) register their own
    # TracerProvider during import. OTel forbids overriding it, so we attach
    # our OTLP exporter to the *existing* provider instead — additive setup
    # is robust against any future library doing the same.
    existing_provider = trace.get_tracer_provider()
    if isinstance(existing_provider, TracerProvider):
        provider = existing_provider
        info_logger.info(
            format_log_message(
                "otel_tracing_attached_to_existing_provider"
            )
        )
    else:
        provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(provider)
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=traces_endpoint))
    )

    # --- Logs pipeline -------------------------------------------------
    # Send every Python ``logging`` record to SigNoz via OTLP/HTTP. The
    # existing stdout JSON handlers stay in place — they're a local
    # fallback when the collector is down.
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=logs_endpoint))
    )
    set_logger_provider(logger_provider)

    otel_log_handler = LoggingHandler(
        level=_stdlib_logging.NOTSET,
        logger_provider=logger_provider,
    )
    # Attach to the root logger so every named logger inherits the handler.
    root_logger = _stdlib_logging.getLogger()
    if not any(
        isinstance(h, LoggingHandler) for h in root_logger.handlers
    ):
        root_logger.addHandler(otel_log_handler)
    # Our two named loggers have ``propagate=False``, so attach explicitly.
    for name in ("info.log", "exception.log", "warning.log"):
        named = _stdlib_logging.getLogger(name)
        if not any(isinstance(h, LoggingHandler) for h in named.handlers):
            named.addHandler(otel_log_handler)

    # Auto-instrument the surfaces we own. Each call is idempotent.
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    RedisInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    LoggingInstrumentor().instrument(set_logging_format=False)

    info_logger.info(
        format_log_message(
            "otel_tracing_initialized",
            service=service_name,
            traces_endpoint=traces_endpoint,
            logs_endpoint=logs_endpoint,
            endpoint=traces_endpoint,
        )
    )
    _TRACING_INITIALIZED = True
