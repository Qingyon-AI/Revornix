"""agent 工具清单的棘轮测试:注册表里的每个工具都必须归队。

漏标 CONFIRMATION = 写操作裸奔;漏标 READ_ONLY 只是子智能体少一个工具。
两边都不该靠人记得 —— 加一个工具,这个测试就该逼你给它归队。
"""

import asyncio

from agent import tool_manifest


def _specs():
    return asyncio.run(tool_manifest.agent_tool_specs())


def test_every_tool_is_classified():
    specs = _specs()
    assert specs, "manifest should not be empty"
    unclassified = [s.name for s in specs if not s.confirmation and not s.read_only]
    assert not unclassified, (
        f"tools missing from both CONFIRMATION_TOOLS and READ_ONLY_TOOLS: {unclassified}"
    )


def test_classification_sets_match_registry():
    specs = _specs()
    names = {s.name for s in specs}
    for name in tool_manifest.CONFIRMATION_TOOLS:
        assert name in names, f"CONFIRMATION_TOOLS names a tool that does not exist: {name}"
    for name in tool_manifest.READ_ONLY_TOOLS:
        assert name in names, f"READ_ONLY_TOOLS names a tool that does not exist: {name}"
    overlap = set(tool_manifest.CONFIRMATION_TOOLS) & set(tool_manifest.READ_ONLY_TOOLS)
    assert not overlap, f"tool cannot be both confirmation-gated and read-only: {overlap}"


def test_no_duplicate_tool_names():
    specs = _specs()
    names = [s.name for s in specs]
    assert len(names) == len(set(names)), "duplicate tool names across registries"


def test_gated_tools_carry_protocol_note():
    for spec in _specs():
        if spec.confirmation:
            assert "BLOCKS until the user approves" in spec.description
        else:
            assert "BLOCKS until the user approves" not in spec.description


def test_fit_arguments_drops_unknown_keys():
    def fn(a: int, ctx=None):
        return a

    fitted, dropped = tool_manifest._fit_arguments(fn, {"a": 1, "bogus": 2, "ctx": 9})
    assert fitted == {"a": 1}
    assert dropped == ["bogus", "ctx"]


def test_invoke_plain_tool_without_ctx():
    result = asyncio.run(tool_manifest.invoke_tool("current_time", {"input_timezone": "Asia/Shanghai"}, user_id=1))
    assert isinstance(result, str) and result


def test_invoke_missing_tool():
    try:
        asyncio.run(tool_manifest.invoke_tool("no_such_tool", {}, user_id=1))
    except tool_manifest.ToolNotFoundError:
        return
    raise AssertionError("expected ToolNotFoundError")
