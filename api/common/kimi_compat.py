from __future__ import annotations

from typing import Any


KIMI_THINKING_TOGGLE_MODELS = (
    "kimi-k2.5",
    "kimi-k2.6",
)


def should_disable_kimi_thinking_for_tools(model_name: str | None) -> bool:
    if not model_name:
        return False

    normalized_model_name = model_name.strip().lower()
    return any(
        model in normalized_model_name
        for model in KIMI_THINKING_TOGGLE_MODELS
    )


def build_kimi_tool_compatible_extra_body(
    model_name: str | None,
) -> dict[str, Any] | None:
    if not should_disable_kimi_thinking_for_tools(model_name):
        return None

    return {
        "thinking": {
            "type": "disabled",
        },
    }
