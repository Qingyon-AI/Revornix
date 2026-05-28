"""OpenTelemetry-backed timing helpers for celery-worker workflows.

The public API (``wrap_workflow_node``, ``add_timed_node``, ``timed_stage``,
``ainvoke_with_timing``) is preserved so existing call-sites keep compiling;
the implementation has been rewritten to emit proper OTel spans instead of
``info_logger`` strings.

Why this matters:
- Spans give exact start/end timestamps + parent/child relationships → Jaeger
  draws a flame chart for the entire workflow without grep tricks.
- Attributes are typed and queryable in any OTLP backend; the old log lines
  were free-form strings that needed per-line regex to analyse.
- Errors recorded with ``span.record_exception`` show up alongside the timing
  so a failing stage is immediately attributable.

Migration helpers:
- ``set_stage_metrics(**kwargs)`` attaches breakdown values (``foo_elapsed_ms``)
  to the active span. Use it where the old code had a multi-field
  ``[WorkflowTiming] stage_summary`` log line.
"""
from __future__ import annotations

import inspect
import time
from contextlib import contextmanager
from functools import wraps
from typing import Any, Callable, Iterator

from opentelemetry import trace
from opentelemetry.trace import Span, Status, StatusCode

from common.logger import exception_logger, info_logger, log_event

_tracer = trace.get_tracer("revornix-worker.workflow")


_STATE_CONTEXT_KEYS = (
    "document_id",
    "section_id",
    "user_id",
    "status",
    "trigger_event_uuid",
    "auto_summary",
    "auto_podcast",
    "auto_transcribe",
    "auto_tag",
)


def _attr_safe(value: Any) -> Any:
    """Coerce a value to a type OTel accepts as a span attribute."""
    if value is None:
        return None
    if isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


def _attach_state_attrs(span: Span, payload: Any, *, prefix: str = "workflow") -> None:
    if not span.is_recording():
        return
    if isinstance(payload, dict):
        for key in _STATE_CONTEXT_KEYS:
            value = payload.get(key)
            if value is None:
                continue
            attr = _attr_safe(value)
            if attr is not None:
                span.set_attribute(f"{prefix}.{key}", attr)
    else:
        span.set_attribute(f"{prefix}.state_type", type(payload).__name__)


def _log_context_from_state(payload: Any) -> dict[str, Any]:
    """Extract loggable context (document_id/section_id/user_id/...) from a
    langgraph state dict so log lines carry the same correlation fields as
    OTel spans.
    """
    if not isinstance(payload, dict):
        return {}
    context: dict[str, Any] = {}
    for key in _STATE_CONTEXT_KEYS:
        value = payload.get(key)
        if value is None:
            continue
        context[key] = value
    return context


def set_stage_metrics(**metrics: Any) -> None:
    """Attach typed metric attributes (e.g. ``foo_elapsed_ms=12.3``) to the
    current span. Silently no-ops when no span is active.
    """
    span = trace.get_current_span()
    if span is None or not span.is_recording():
        return
    for key, value in metrics.items():
        if value is None:
            continue
        attr = _attr_safe(value)
        if attr is not None:
            span.set_attribute(key, attr)


def wrap_workflow_node(
    *,
    workflow_name: str,
    node_name: str,
    node_func: Callable[..., Any],
) -> Callable[..., Any]:
    span_name = f"workflow.node {workflow_name}/{node_name}"
    is_async = inspect.iscoroutinefunction(node_func)

    if is_async:
        @wraps(node_func)
        async def _async_wrapper(*args: Any, **kwargs: Any) -> Any:
            with _tracer.start_as_current_span(span_name) as span:
                span.set_attribute("workflow.name", workflow_name)
                span.set_attribute("workflow.node", node_name)
                state = args[0] if args else kwargs.get("state")
                _attach_state_attrs(span, state, prefix="workflow")
                log_ctx = _log_context_from_state(state)
                log_event(
                    info_logger,
                    "workflow_node_started",
                    workflow_name=workflow_name,
                    node_name=node_name,
                    **log_ctx,
                )
                started = time.perf_counter()
                try:
                    result = await node_func(*args, **kwargs)
                except Exception as exc:
                    duration_ms = round((time.perf_counter() - started) * 1000, 2)
                    span.record_exception(exc)
                    span.set_status(Status(StatusCode.ERROR, str(exc)))
                    log_event(
                        exception_logger,
                        "workflow_node_failed",
                        level=40,  # logging.ERROR
                        workflow_name=workflow_name,
                        node_name=node_name,
                        duration_ms=duration_ms,
                        error=repr(exc),
                        **log_ctx,
                    )
                    raise
                duration_ms = round((time.perf_counter() - started) * 1000, 2)
                log_event(
                    info_logger,
                    "workflow_node_finished",
                    workflow_name=workflow_name,
                    node_name=node_name,
                    duration_ms=duration_ms,
                    **log_ctx,
                )
                return result

        return _async_wrapper

    @wraps(node_func)
    def _sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        with _tracer.start_as_current_span(span_name) as span:
            span.set_attribute("workflow.name", workflow_name)
            span.set_attribute("workflow.node", node_name)
            state = args[0] if args else kwargs.get("state")
            _attach_state_attrs(span, state, prefix="workflow")
            log_ctx = _log_context_from_state(state)
            log_event(
                info_logger,
                "workflow_node_started",
                workflow_name=workflow_name,
                node_name=node_name,
                **log_ctx,
            )
            started = time.perf_counter()
            try:
                result = node_func(*args, **kwargs)
            except Exception as exc:
                duration_ms = round((time.perf_counter() - started) * 1000, 2)
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, str(exc)))
                log_event(
                    exception_logger,
                    "workflow_node_failed",
                    level=40,
                    workflow_name=workflow_name,
                    node_name=node_name,
                    duration_ms=duration_ms,
                    error=repr(exc),
                    **log_ctx,
                )
                raise
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            log_event(
                info_logger,
                "workflow_node_finished",
                workflow_name=workflow_name,
                node_name=node_name,
                duration_ms=duration_ms,
                **log_ctx,
            )
            return result

    return _sync_wrapper


def add_timed_node(
    workflow,
    *,
    workflow_name: str,
    node_name: str,
    node_func: Callable[..., Any],
) -> None:
    workflow.add_node(
        node_name,
        wrap_workflow_node(
            workflow_name=workflow_name,
            node_name=node_name,
            node_func=node_func,
        ),
    )


@contextmanager
def timed_stage(
    *,
    workflow_name: str,
    node_name: str,
    stage_name: str,
    context: dict[str, Any] | None = None,
) -> Iterator[Span]:
    span_name = f"workflow.stage {workflow_name}/{node_name}/{stage_name}"
    with _tracer.start_as_current_span(span_name) as span:
        span.set_attribute("workflow.name", workflow_name)
        span.set_attribute("workflow.node", node_name)
        span.set_attribute("workflow.stage", stage_name)
        log_ctx: dict[str, Any] = {}
        if context:
            for key, value in context.items():
                if value is None:
                    continue
                attr = _attr_safe(value)
                if attr is not None:
                    span.set_attribute(f"context.{key}", attr)
                    log_ctx[key] = attr
        log_event(
            info_logger,
            "workflow_stage_started",
            workflow_name=workflow_name,
            node_name=node_name,
            stage_name=stage_name,
            **log_ctx,
        )
        started = time.perf_counter()
        try:
            yield span
        except Exception as exc:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            log_event(
                exception_logger,
                "workflow_stage_failed",
                level=40,
                workflow_name=workflow_name,
                node_name=node_name,
                stage_name=stage_name,
                duration_ms=duration_ms,
                error=repr(exc),
                **log_ctx,
            )
            raise
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            info_logger,
            "workflow_stage_finished",
            workflow_name=workflow_name,
            node_name=node_name,
            stage_name=stage_name,
            duration_ms=duration_ms,
            **log_ctx,
        )


async def ainvoke_with_timing(
    *,
    workflow_name: str,
    workflow,
    payload: dict[str, Any],
) -> Any:
    span_name = f"workflow.invoke {workflow_name}"
    with _tracer.start_as_current_span(span_name) as span:
        span.set_attribute("workflow.name", workflow_name)
        _attach_state_attrs(span, payload, prefix="workflow")
        log_ctx = _log_context_from_state(payload)
        log_event(
            info_logger,
            "workflow_invoke_started",
            workflow_name=workflow_name,
            **log_ctx,
        )
        started = time.perf_counter()
        try:
            result = await workflow.ainvoke(payload)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            log_event(
                exception_logger,
                "workflow_invoke_failed",
                level=40,
                workflow_name=workflow_name,
                duration_ms=duration_ms,
                error=repr(exc),
                **log_ctx,
            )
            raise
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            info_logger,
            "workflow_invoke_finished",
            workflow_name=workflow_name,
            duration_ms=duration_ms,
            **log_ctx,
        )
        return result
