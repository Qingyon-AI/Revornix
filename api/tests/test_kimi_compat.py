from common.kimi_compat import (
    build_kimi_tool_compatible_extra_body,
    should_disable_kimi_thinking_for_tools,
)


def test_disables_thinking_for_kimi_k25_tool_compatibility():
    assert should_disable_kimi_thinking_for_tools("kimi-k2.5")
    assert build_kimi_tool_compatible_extra_body("kimi-k2.5") == {
        "thinking": {
            "type": "disabled",
        },
    }


def test_disables_thinking_for_versioned_kimi_k25_model_names():
    assert should_disable_kimi_thinking_for_tools("moonshot/kimi-k2.5-preview")


def test_keeps_other_models_unchanged():
    assert not should_disable_kimi_thinking_for_tools("gpt-4.1")
    assert build_kimi_tool_compatible_extra_body("gpt-4.1") is None
