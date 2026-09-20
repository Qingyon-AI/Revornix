"""压缩水位的两个常量,Python 侧与 sidecar 侧必须是同一个数。

`app/agent/host.py` 用它们算界面上那个上下文水位条;`agent-sidecar/src/compaction.ts`
用它们决定**什么时候真的压缩对话**。两边对不上时不会有任何报错:

- Python 估得比 sidecar 小 → 水位条显示 60%,而 sidecar 已经压过了,用户看见"模型
  忘事"却发现上下文远没满;
- Python 估得比 sidecar 大 → 水位条一直逼近 100%,用户以为快炸了,实际不会压。

两个文件分属两种语言、两个目录,`compaction.ts` 里那句"和后端是同一个数"是一条
**没人执行的约定**。这个仓库为同类约定付过代价(两份镜像代码靠注释保持同步,最后
是 worker 起不来才发现),所以这里让它变成一条会红的检查。

纯文本解析,不需要 node,也不需要装 sidecar 的依赖。
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
COMPACTION_TS = REPO / "agent-sidecar" / "src" / "compaction.ts"


def _ts_const(name: str) -> float:
    source = COMPACTION_TS.read_text(encoding="utf-8")
    match = re.search(rf"export const {name}\s*=\s*([0-9.]+)\s*;", source)
    assert match, f"{COMPACTION_TS.name} 里找不到 {name} —— 常量被改名或删了,这条检查也要跟着更新"
    return float(match.group(1))


def test_compaction_file_exists():
    """文件没了就不是"检查通过",是这条检查失去了对象。"""
    assert COMPACTION_TS.exists(), f"找不到 {COMPACTION_TS}"


@pytest.mark.parametrize("name", ["FALLBACK_CONTEXT_WINDOW", "CHARS_PER_TOKEN"])
def test_python_and_sidecar_agree(name: str):
    from agent import host

    python_value = getattr(host, name)
    ts_value = _ts_const(name)
    assert float(python_value) == ts_value, (
        f"{name} 两侧不一致:host.py = {python_value},compaction.ts = {ts_value}。"
        "界面显示的水位与 sidecar 真正的压缩时机会对不上,而且不会报任何错。"
    )
