#!/usr/bin/env python3
"""校验 api/ 与 celery-worker/ 之间那些必须逐字节一致的文件真的一致。

这两个服务共享一批代码：模型、schema、数据访问、通知、部分工具函数，各存一份。
约定说「改一处要同步另一处」，但此前没有任何东西会在漏改时失败 —— 而它们**已经
不完全相等**了（worker 的 ``models/`` 就少几个模块）。

全量比对是行不通的：有些差异是有意的。所以需要一份明确的「哪些必须一致」，
它有两个来源，两种都认：

1. **清单** ``scripts/mirrored-files.txt`` —— 批量守护既有的共享代码。它是一份
   事实快照，一次覆盖上百个文件，不必逐个去改。
2. **就近标记** —— 在文件里写下 ``MIRRORED-FILE: api/ <-> celery-worker/``。
   好处是改这个文件的人一眼就能看到，适合新写的核心共享代码。

某个文件确实要在两侧分化时，把它从清单里删掉 / 去掉标记 —— 让"允许漂移"成为一个
需要解释的动作，而不是随手发生的事。

用法::

    python scripts/check_mirrored_files.py
"""

from __future__ import annotations

import difflib
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SIDES = ("api", "celery-worker")
MARKER = "MIRRORED-FILE: api/ <-> celery-worker/"
SKIP_DIRS = {"__pycache__", ".venv", "venv", "node_modules", "logs"}


def _iter_python(root: Path):
    for path in root.rglob("*.py"):
        if SKIP_DIRS & set(path.relative_to(root).parts):
            continue
        yield path


MANIFEST = Path(__file__).resolve().parent / "mirrored-files.txt"


def _read_manifest() -> set[str]:
    if not MANIFEST.is_file():
        return set()
    entries: set[str] = set()
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            entries.add(line)
    return entries


def main() -> int:
    for side in SIDES:
        if not (REPO / side).is_dir():
            print(f"找不到目录：{REPO / side}", file=sys.stderr)
            return 1

    # 来源一：清单
    marked = _read_manifest()

    # 来源二：文件里的就近标记
    for side in SIDES:
        root = REPO / side
        for path in _iter_python(root):
            try:
                if MARKER in path.read_text(encoding="utf-8"):
                    marked.add(str(path.relative_to(root)))
            except UnicodeDecodeError:
                continue

    if not marked:
        print("没有文件声明镜像要求，跳过。")
        return 0

    problems: list[str] = []
    for rel in sorted(marked):
        paths = {side: REPO / side / rel for side in SIDES}
        missing = [side for side, p in paths.items() if not p.is_file()]
        if missing:
            problems.append(
                f"{rel}: 声明了镜像，但在 {', '.join(missing)} 下不存在"
            )
            continue

        texts = {side: p.read_text(encoding="utf-8") for side, p in paths.items()}
        a, b = SIDES
        if texts[a] != texts[b]:
            diff = "".join(
                difflib.unified_diff(
                    texts[a].splitlines(keepends=True),
                    texts[b].splitlines(keepends=True),
                    fromfile=f"{a}/{rel}",
                    tofile=f"{b}/{rel}",
                )
            )
            problems.append(f"{rel}: 两侧内容不一致\n{diff}")

    if problems:
        print("镜像文件校验失败：\n", file=sys.stderr)
        for item in problems:
            print(f"  - {item}", file=sys.stderr)
        print(
            "\n改动其中一侧时，请把同样的改动同步到另一侧。",
            file=sys.stderr,
        )
        return 1

    print(f"镜像文件校验通过（{len(marked)} 个）：")
    for rel in sorted(marked):
        print(f"  - {rel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
