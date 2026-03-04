import inspect
import time
from contextlib import contextmanager
from functools import wraps
from typing import Any, Callable

from common.logger import exception_logger, info_logger


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


def _stringify_value(value: Any) -> str:
    text = str(value)
    if len(text) <= 64:
        return text
    return text[:61] + "..."


def _format_context_from_mapping(data: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in _STATE_CONTEXT_KEYS:
        value = data.get(key)
        if value is None:
            continue
        parts.append(f"{key}={_stringify_value(value)}")
    if parts:
        return ", ".join(parts)

    keys_preview = ",".join(sorted(data.keys())[:8])
    return f"state_keys={keys_preview}"


def _format_context(state_or_payload: Any) -> str:
    if isinstance(state_or_payload, dict):
        return _format_context_from_mapping(state_or_payload)
    return f"state_type={type(state_or_payload).__name__}"


def _format_brief_mapping(data: dict[str, Any], *, limit: int = 8) -> str:
    if not data:
        return "no_context"
    pairs = sorted(data.items(), key=lambda item: item[0])
    parts: list[str] = []
    for key, value in pairs[:limit]:
        if value is None:
            continue
        parts.append(f"{key}={_stringify_value(value)}")
    if len(pairs) > limit:
        parts.append("...")
    if parts:
        return ", ".join(parts)
    return "no_context"


def _preview_keys(keys: list[str], *, limit: int = 8) -> str:
    if not keys:
        return "-"
    if len(keys) <= limit:
        return ",".join(keys)
    return ",".join(keys[:limit]) + ",..."


def _format_state_delta(before: Any, after: Any) -> str:
    if not isinstance(before, dict) or not isinstance(after, dict):
        return "state_delta=unavailable"

    before_keys = set(before.keys())
    after_keys = set(after.keys())
    added_keys = sorted(after_keys - before_keys)
    removed_keys = sorted(before_keys - after_keys)
    shared_keys = before_keys & after_keys
    changed_keys = sorted(
        key for key in shared_keys
        if before.get(key) != after.get(key)
    )

    return (
        "state_delta="
        f"added[{len(added_keys)}]={_preview_keys(added_keys)}; "
        f"changed[{len(changed_keys)}]={_preview_keys(changed_keys)}; "
        f"removed[{len(removed_keys)}]={_preview_keys(removed_keys)}"
    )


def wrap_workflow_node(
    *,
    workflow_name: str,
    node_name: str,
    node_func: Callable[..., Any],
) -> Callable[..., Any]:
    if inspect.iscoroutinefunction(node_func):
        @wraps(node_func)
        async def _async_wrapper(*args: Any, **kwargs: Any) -> Any:
            state = args[0] if args else kwargs.get("state")
            before_state = state.copy() if isinstance(state, dict) else state
            context = _format_context(state)
            start = time.perf_counter()
            info_logger.info(
                f"[WorkflowTiming] node_start workflow={workflow_name}, node={node_name}, {context}"
            )
            try:
                result = await node_func(*args, **kwargs)
            except Exception as e:
                elapsed_ms = (time.perf_counter() - start) * 1000
                exception_logger.error(
                    f"[WorkflowTiming] node_error workflow={workflow_name}, node={node_name}, "
                    f"elapsed_ms={elapsed_ms:.2f}, {context}, error={e}"
                )
                raise
            elapsed_ms = (time.perf_counter() - start) * 1000
            result_context = _format_context(result)
            state_delta = _format_state_delta(before_state, result)
            info_logger.info(
                f"[WorkflowTiming] node_end workflow={workflow_name}, node={node_name}, "
                f"elapsed_ms={elapsed_ms:.2f}, input={context}, output={result_context}, {state_delta}"
            )
            return result

        return _async_wrapper

    @wraps(node_func)
    def _sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        state = args[0] if args else kwargs.get("state")
        before_state = state.copy() if isinstance(state, dict) else state
        context = _format_context(state)
        start = time.perf_counter()
        info_logger.info(
            f"[WorkflowTiming] node_start workflow={workflow_name}, node={node_name}, {context}"
        )
        try:
            result = node_func(*args, **kwargs)
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            exception_logger.error(
                f"[WorkflowTiming] node_error workflow={workflow_name}, node={node_name}, "
                f"elapsed_ms={elapsed_ms:.2f}, {context}, error={e}"
            )
            raise
        elapsed_ms = (time.perf_counter() - start) * 1000
        result_context = _format_context(result)
        state_delta = _format_state_delta(before_state, result)
        info_logger.info(
            f"[WorkflowTiming] node_end workflow={workflow_name}, node={node_name}, "
            f"elapsed_ms={elapsed_ms:.2f}, input={context}, output={result_context}, {state_delta}"
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
):
    context_text = _format_brief_mapping(context) if context else "no_context"
    start = time.perf_counter()
    info_logger.info(
        f"[WorkflowTiming] stage_start workflow={workflow_name}, node={node_name}, "
        f"stage={stage_name}, {context_text}"
    )
    try:
        yield
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        exception_logger.error(
            f"[WorkflowTiming] stage_error workflow={workflow_name}, node={node_name}, "
            f"stage={stage_name}, elapsed_ms={elapsed_ms:.2f}, {context_text}, error={e}"
        )
        raise
    elapsed_ms = (time.perf_counter() - start) * 1000
    info_logger.info(
        f"[WorkflowTiming] stage_end workflow={workflow_name}, node={node_name}, "
        f"stage={stage_name}, elapsed_ms={elapsed_ms:.2f}, {context_text}"
    )


async def ainvoke_with_timing(
    *,
    workflow_name: str,
    workflow,
    payload: dict[str, Any],
) -> Any:
    context = _format_context(payload)
    start = time.perf_counter()
    info_logger.info(
        f"[WorkflowTiming] workflow_start workflow={workflow_name}, {context}"
    )
    try:
        result = await workflow.ainvoke(payload)
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        exception_logger.error(
            f"[WorkflowTiming] workflow_error workflow={workflow_name}, elapsed_ms={elapsed_ms:.2f}, "
            f"{context}, error={e}"
        )
        raise
    elapsed_ms = (time.perf_counter() - start) * 1000
    info_logger.info(
        f"[WorkflowTiming] workflow_end workflow={workflow_name}, elapsed_ms={elapsed_ms:.2f}, {context}"
    )
    return result
