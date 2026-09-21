"""权限档位:哪一次调用可以不问就跑。

这是一条**授权边界**,而它的失败是静默的 —— 判据里漏一个分支,`auto` 档就会把删除
也放过去,而界面上看不出任何异样:用户只会在某一天发现文档没了。所以每一档 × 每一类
权限都写成一条断言,而不是抽样。

`auto` 这一档此前**在代码里根本不存在** —— 接口校验放它过、会话表存得下它,
但判据只看 `bypass`,于是选了它和选 manual 完全一样。这份用例是它的定义。
"""

from __future__ import annotations

import pytest

from agent.confirmations import may_run_without_asking

#: 三档 × 三类权限的完整真值表。留空的那一格不存在 —— 每一格都要有答案。
CASES = [
    # (mode, permission, 可以不问就跑)
    ("manual", "edit", False),
    ("manual", "ai-cost", False),
    ("manual", "destructive", False),
    ("auto", "edit", True),
    ("auto", "ai-cost", False),
    ("auto", "destructive", False),
    ("bypass", "edit", True),
    ("bypass", "ai-cost", True),
    ("bypass", "destructive", True),
]


@pytest.mark.parametrize("mode,permission,expected", CASES)
def test_permission_matrix(mode: str, permission: str, expected: bool):
    assert (
        may_run_without_asking(
            permission=permission, mode=mode, auto_allow_tools=[], tool="whatever"
        )
        is expected
    )


def test_auto_never_covers_deletion():
    """把这条单拎出来:`auto` 放过删除是这套东西唯一一种不可逆的错法。"""
    assert not may_run_without_asking(
        permission="destructive", mode="auto", auto_allow_tools=[], tool="delete_documents"
    )


def test_session_allow_list_beats_the_mode():
    """「本会话始终允许」是用户对**这一个工具**的明示授权,比档位更具体,所以更优先。"""
    assert may_run_without_asking(
        permission="destructive",
        mode="manual",
        auto_allow_tools=["delete_documents"],
        tool="delete_documents",
    )


def test_unknown_mode_falls_back_to_asking():
    """认不出来的档位必须落回「问」。

    档位是一个字符串列(不是枚举约束),拼错、降级、手改数据库都可能让它变成别的值 ——
    那时唯一安全的默认是最严的那一档。
    """
    for mode in (None, "", "Auto", "BYPASS", "yolo"):
        assert not may_run_without_asking(
            permission="edit", mode=mode, auto_allow_tools=[], tool="update_document"
        )
