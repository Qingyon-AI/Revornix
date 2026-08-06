"""worker 镜像里只有 chromium 的 headless shell，没有完整浏览器。

`playwright install chromium` 会下两份二进制：完整 chromium(641 MB)和
headless shell(340 MB)。`launch(headless=True)` 跑的是后者，前者纯属白带，
所以镜像里只装了 headless shell —— 省 880 MB。

代价是一条约束：**任何一处 `launch(headless=False)` 都会在容器里缺二进制**。
本机开发时不会发现，因为开发机上通常两份都在；表现是线上网页转换直接报
"Executable doesn't exist"，而代码看着完全正常。

这条用例就是那道围栏。它红了说明二者必须一起改：要么把那处改回 headless=True，
要么在 worker/Dockerfile 里把浏览器换成完整的 `chromium`。
"""

import ast
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SOURCE_DIRS = [REPO / "app", REPO / "worker"]


def _python_files():
    for root in SOURCE_DIRS:
        for path in root.rglob("*.py"):
            if "__pycache__" in path.parts or ".venv" in path.parts:
                continue
            if path.name == Path(__file__).name:
                continue
            yield path


def _launch_calls(tree):
    """找出所有 *.launch(...) 调用，连同它的 headless 实参。"""
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        if not (isinstance(func, ast.Attribute) and func.attr in {"launch", "launch_persistent_context"}):
            continue
        headless = None
        for kw in node.keywords:
            if kw.arg == "headless":
                headless = kw.value
        yield node, headless


def test_no_headful_browser_launch():
    offenders = []
    seen_any = False

    for path in _python_files():
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:  # 语法错误由 compileall 那一步负责报
            continue

        for node, headless in _launch_calls(tree):
            seen_any = True
            rel = path.relative_to(REPO)
            # 没写 headless=：Playwright 的默认值是 True，但依赖默认值太脆 ——
            # 这里要求显式写出来，因为镜像的内容正是按它裁的。
            if headless is None:
                offenders.append(f"{rel}:{node.lineno} 没有显式传 headless=")
            elif not (isinstance(headless, ast.Constant) and headless.value is True):
                offenders.append(f"{rel}:{node.lineno} headless 不是字面量 True")

    # 一个 launch 都没找到，多半是这条用例自己坏了（比如目录结构变了），
    # 而不是"代码里真的没有浏览器调用"。静默通过的围栏比没有围栏更糟。
    assert seen_any, "没有找到任何 browser.launch 调用，检查这条用例的扫描范围"

    assert not offenders, (
        "worker 镜像里只有 chromium-headless-shell，headful 启动会缺二进制：\n  "
        + "\n  ".join(offenders)
        + "\n要 headful 的话，worker/Dockerfile 里的浏览器要换成完整的 `chromium`。"
    )


@pytest.mark.parametrize("browser", ["firefox", "webkit"])
def test_only_chromium_is_used(browser):
    """镜像里没有 firefox / webkit，用了就会在运行时才发现。"""
    offenders = [
        f"{path.relative_to(REPO)}"
        for path in _python_files()
        if f"p.{browser}." in path.read_text(encoding="utf-8")
    ]
    assert not offenders, (
        f"worker 镜像里没有 {browser}，只装了 chromium 的 headless shell：\n  "
        + "\n  ".join(offenders)
    )
