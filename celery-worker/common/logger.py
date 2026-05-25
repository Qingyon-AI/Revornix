"""Structured logger for celery-worker.

Output is JSON one-line-per-record so logs from worker, api and web tier can
be joined by ``trace_id``. Existing call-sites that use ``format_log_message``
keep working — the formatter wraps the resulting ``key=value`` message inside
the structured payload.

OpenTelemetry's ``LoggingInstrumentor`` (configured in ``common.tracing``)
injects ``otelTraceID`` / ``otelSpanID`` attributes into every LogRecord; we
emit them as ``trace_id`` / ``span_id`` so downstream tools (Jaeger logs
correlation, Grafana, etc.) can pivot from a span to its surrounding logs.
"""
from __future__ import annotations

import json
import logging
import os
import re
import traceback
from datetime import datetime
from logging import handlers
from typing import Any

from config.base import BASE_DIR


_LOG_FORMAT = os.environ.get("WORKER_LOG_FORMAT", "json").strip().lower()


class _TimezoneAwareFormatter(logging.Formatter):

    def formatTime(self, record: logging.LogRecord, datefmt: str | None = None) -> str:
        dt = datetime.fromtimestamp(record.created).astimezone()
        if datefmt:
            return dt.strftime(datefmt)
        return dt.isoformat(timespec='milliseconds')


class _JsonFormatter(logging.Formatter):
    """Emit one JSON line per record, including OTel trace correlation."""

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created).astimezone().isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": message,
        }

        # OpenTelemetry LoggingInstrumentor injects these attributes onto every
        # LogRecord; surface them as flat fields for log aggregators.
        otel_trace = getattr(record, "otelTraceID", None)
        otel_span = getattr(record, "otelSpanID", None)
        if otel_trace and otel_trace != "0":
            payload["trace_id"] = otel_trace
        if otel_span and otel_span != "0":
            payload["span_id"] = otel_span

        # Celery task context, if present (added by Celery's logging handler).
        task_id = getattr(record, "task_id", None)
        task_name = getattr(record, "task_name", None)
        if task_id:
            payload["celery_task_id"] = task_id
        if task_name:
            payload["celery_task_name"] = task_name

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        # Lift extra=… dict keys so structured callers don't need to bake
        # everything into the message string.
        for key, value in record.__dict__.items():
            if key in payload or key.startswith("_"):
                continue
            if key in {
                "args", "asctime", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "module",
                "msecs", "message", "msg", "name", "pathname", "process",
                "processName", "relativeCreated", "stack_info", "thread",
                "threadName", "otelTraceID", "otelSpanID", "otelServiceName",
                "task_id", "task_name", "taskset",
            }:
                continue
            try:
                json.dumps(value)
                payload[key] = value
            except TypeError:
                payload[key] = repr(value)

        return json.dumps(payload, ensure_ascii=False, default=str)


class BaseLogger(object):

    level_relations: dict[str, int] = {
        'debug': logging.DEBUG,
        'info': logging.INFO,
        'warning': logging.WARNING,
        'error': logging.ERROR,
        'crit': logging.CRITICAL,
    }

    def __init__(
        self,
        filename: str,
        level: str = 'info',
        when: str = 'D',
        backCount: int = 3,
        fmt: str = '%(asctime)s - %(pathname)s[line:%(lineno)d] - %(levelname)s: %(message)s',
    ) -> None:
        self.logger = logging.getLogger(filename)
        level_value = self.level_relations.get(level, logging.INFO)
        self.logger.setLevel(level_value)
        self.logger.propagate = False

        if _LOG_FORMAT == 'json':
            formatter: logging.Formatter = _JsonFormatter()
        else:
            formatter = _TimezoneAwareFormatter(fmt)

        log_file_path = os.path.join(str(BASE_DIR), "logs", filename)
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        file_handler = handlers.TimedRotatingFileHandler(
            filename=log_file_path,
            when=when,
            backupCount=backCount,
            encoding='utf-8',
        )
        file_handler.setFormatter(formatter)

        has_stream_handler = any(
            isinstance(handler, logging.StreamHandler)
            and not isinstance(handler, handlers.TimedRotatingFileHandler)
            for handler in self.logger.handlers
        )
        has_file_handler = any(
            isinstance(handler, handlers.TimedRotatingFileHandler)
            and getattr(handler, "baseFilename", None) == os.path.abspath(log_file_path)
            for handler in self.logger.handlers
        )
        if not has_stream_handler:
            self.logger.addHandler(stream_handler)
        if not has_file_handler:
            self.logger.addHandler(file_handler)


exception_logger = BaseLogger("exception.log").logger
info_logger = BaseLogger("info.log").logger


def _stringify_log_value(value: Any, *, limit: int = 300) -> str:
    if isinstance(value, (dict, list, tuple, set)):
        try:
            text = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
        except TypeError:
            text = str(value)
    else:
        text = str(value)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[: limit - 3] + "..."
    if not text:
        return '""'
    if any(char.isspace() for char in text) or "=" in text:
        return json.dumps(text, ensure_ascii=False)
    return text


def format_log_message(event: str, **fields: Any) -> str:
    """Render a ``key=value`` style message string.

    Retained for backwards compatibility — JSON callers should prefer
    ``info_logger.info(event_name, extra={...})`` so each field becomes a
    typed JSON attribute.
    """
    parts = [f"event={_stringify_log_value(event)}"]
    for key, value in fields.items():
        if value is None:
            continue
        parts.append(f"{key}={_stringify_log_value(value)}")
    return " ".join(parts)


def log_event(
    logger: logging.Logger,
    event: str,
    *,
    level: int = logging.INFO,
    **fields: Any,
) -> None:
    """Emit a structured event with typed JSON fields.

    Prefer this over ``info_logger.info(format_log_message(...))`` when adding
    new logs — the JSON formatter renders each field as a real attribute.
    """
    cleaned = {k: v for k, v in fields.items() if v is not None}
    logger.log(level, event, extra=cleaned)


def log_exception() -> None:
    exception_logger.error(traceback.format_exc())
