"""OpenTelemetry bootstrap for celery-worker.

``setup_worker_tracing()`` should be called once per worker process. It is
idempotent and a no-op when ``OTEL_SDK_DISABLED=true`` or when the OTel
packages are absent (handy for minimal envs / tests).

The W3C ``traceparent`` header is propagated through Celery message metadata
by ``opentelemetry-instrumentation-celery``, so trace contexts started in the
API tier (or anywhere upstream) automatically continue inside worker tasks.
"""
from __future__ import annotations

import os
from typing import Any


_TRACING_INITIALIZED_PIDS: set[int] = set()


def sentry_before_send_attach_otel(event: Any, hint: Any) -> Any:
    """Sentry ``before_send`` hook that stamps the current OTel trace context
    onto the outgoing event so Sentry issues pivot to the matching Jaeger
    trace.
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
        # Observability must never break worker tasks.
        pass
    return event


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def setup_worker_tracing() -> None:
    """Initialise OTel for the current worker process.

    Safe to call multiple times; idempotent per pid because Celery may invoke
    ``worker_process_init`` more than once in some pool configurations.
    """
    pid = os.getpid()
    if pid in _TRACING_INITIALIZED_PIDS:
        return

    # Import lazily so log statements emitted by the logger module don't
    # circular-import this file at startup.
    from common.logger import exception_logger, info_logger

    if _bool_env("OTEL_SDK_DISABLED"):
        info_logger.info(
            '{"event":"otel_tracing_disabled","reason":"OTEL_SDK_DISABLED"}'
        )
        _TRACING_INITIALIZED_PIDS.add(pid)
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
        from opentelemetry.instrumentation.celery import CeleryInstrumentor
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
        exception_logger.warning(f'otel_packages_missing error={exc!r}')
        _TRACING_INITIALIZED_PIDS.add(pid)
        return

    service_name = os.environ.get("OTEL_SERVICE_NAME", "revornix-worker")
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
            "process.pid": pid,
        }
    )

    # Third-party packages (e.g. ``mcp_use``) may have already registered a
    # TracerProvider during import; OTel rejects overrides. Attach our OTLP
    # exporter to the existing provider instead so all spans still ship to
    # our collector regardless of import order.
    existing_provider = trace.get_tracer_provider()
    if isinstance(existing_provider, TracerProvider):
        provider = existing_provider
        info_logger.info(
            '{"event":"otel_tracing_attached_to_existing_provider"}'
        )
    else:
        provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(provider)
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=traces_endpoint))
    )

    # --- Logs pipeline -------------------------------------------------
    # Send every Python ``logging`` record to SigNoz via OTLP/HTTP. The
    # stdout JSON formatter in ``common/logger.py`` keeps writing locally
    # as a fallback for when the collector is unreachable.
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=logs_endpoint))
    )
    set_logger_provider(logger_provider)

    otel_log_handler = LoggingHandler(
        level=_stdlib_logging.NOTSET,
        logger_provider=logger_provider,
    )
    root_logger = _stdlib_logging.getLogger()
    if not any(
        isinstance(h, LoggingHandler) for h in root_logger.handlers
    ):
        root_logger.addHandler(otel_log_handler)
    # Named loggers in ``common/logger.py`` have ``propagate=False``, so
    # the root handler never sees them — attach explicitly.
    for name in ("info.log", "exception.log", "warning.log"):
        named = _stdlib_logging.getLogger(name)
        if not any(isinstance(h, LoggingHandler) for h in named.handlers):
            named.addHandler(otel_log_handler)

    # Auto-instrument:
    #   - Celery: producer/consumer spans + traceparent propagation in task headers
    #   - SQLAlchemy: per-query spans
    #   - httpx: outbound HTTP client spans
    #   - redis: per-command spans
    #   - logging: injects otelTraceID / otelSpanID into LogRecord attributes
    CeleryInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()
    RedisInstrumentor().instrument()
    LoggingInstrumentor().instrument(set_logging_format=False)

    info_logger.info(
        f'{{"event":"otel_tracing_initialized","service":"{service_name}",'
        f'"traces_endpoint":"{traces_endpoint}","logs_endpoint":"{logs_endpoint}",'
        f'"pid":{pid}}}'
    )
    _TRACING_INITIALIZED_PIDS.add(pid)


def current_trace_ids() -> tuple[str | None, str | None]:
    """Return (trace_id_hex, span_id_hex) of the active OTel span, if any."""
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        ctx = span.get_span_context() if span else None
        if ctx is None or not ctx.is_valid:
            return None, None
        return format(ctx.trace_id, "032x"), format(ctx.span_id, "016x")
    except Exception:
        return None, None


def get_tracer(name: str = "revornix-worker") -> Any:
    from opentelemetry import trace

    return trace.get_tracer(name)
