#!/usr/bin/env python3
"""静态检查：`from X import Y` 里的 Y 在 X 里是否真的存在。

起因是一次事故：`data/sql/schema_guard.py` 是 api/worker 的镜像文件，里面
`from data.sql.base import engine`。api 侧有这个符号，worker 侧没有 —— 于是
worker 的 `common/celery/app.py`（每个任务都要导入的那个）一导入就 ImportError，
**整个服务起不来**。

已有的三道检查都看不见它：

- `compileall` 只编译不导入；
- 单元测试把 `data.sql.base` 顶成了替身，到不了真实那行；
- 镜像检查只比对两侧字节是否相同 —— 相同正是问题本身。

这个脚本不导入任何模块（那需要装齐 torch 等重依赖），只做 AST 比对：
遍历每个文件的 `from <本仓库模块> import <名字>`，去目标文件里看那个名字是不是
真的定义了。毫秒级，零依赖，两个服务一起查。

**保守**是刻意的：拿不准就放过。会漏报，但不会误报 —— 一个动不动就误报的检查
很快就没人看，而这个检查要守的是"服务起不起得来"。以下情况一律跳过：

- 目标模块里有 `*` 导入（无法静态确定它引入了什么）；
- 目标模块定义了 `__getattr__`（PEP 562，属性可以是动态的）；
- 目标不是本仓库的模块（第三方包不在职责范围内）。
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
# 每个服务是自己的 import 根：`from data.sql.base import x` 在两侧各自解析。
SERVICE_ROOTS = ["api", "worker", "app"]
SKIP_DIRS = {"__pycache__", ".venv", "venv", "node_modules", "alembic", "tests", "tests_integration"}


def iter_python_files(root: Path):
    for path in root.rglob("*.py"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def module_exports(tree: ast.Module) -> tuple[set[str], bool]:
    """模块顶层定义了哪些名字；第二个返回值表示"无法确定，别查了"。"""
    names: set[str] = set()
    opaque = False

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
            if node.name == "__getattr__":
                opaque = True  # PEP 562：属性可以是动态生成的
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    names.add(target.id)
        elif isinstance(node, ast.AnnAssign):
            if isinstance(node.target, ast.Name):
                names.add(node.target.id)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.asname or alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == "*":
                    opaque = True  # 星号导入引入了什么，静态看不出来
                else:
                    names.add(alias.asname or alias.name)
        elif isinstance(node, (ast.If, ast.Try)):
            # 条件定义（try/except ImportError 之类）：只收集，不作为缺失依据
            for sub in ast.walk(node):
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    names.add(sub.name)
                elif isinstance(sub, ast.Assign):
                    for target in sub.targets:
                        if isinstance(target, ast.Name):
                            names.add(target.id)
                elif isinstance(sub, (ast.Import, ast.ImportFrom)):
                    for alias in sub.names:
                        if alias.name == "*":
                            opaque = True
                        else:
                            names.add(alias.asname or alias.name.split(".")[0])

    return names, opaque


def resolve(service_root: Path, dotted: str) -> Path | None:
    """把 `data.sql.base` 解析成文件；不是本仓库模块就返回 None。

    先在服务目录里找，找不到再去 `app/` —— 已经搬进共享包的层（enums、config
    等）以顶级包形式暴露，服务里写的仍是 `from config.base import ...`。少了这一步，
    每搬走一层，这个检查对那一层的覆盖就会**静悄悄消失**。
    """
    parts = dotted.split(".")
    for root in (service_root, REPO / "app"):
        as_module = root.joinpath(*parts).with_suffix(".py")
        if as_module.is_file():
            return as_module
        as_package = root.joinpath(*parts, "__init__.py")
        if as_package.is_file():
            return as_package
    return None


def check_service(service: str) -> list[str]:
    root = REPO / service
    if not root.is_dir():
        return []

    cache: dict[Path, tuple[set[str], bool]] = {}
    problems: list[str] = []

    for path in iter_python_files(root):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue  # 语法错误交给 compileall 报，这里不重复

        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or node.level:
                continue  # 相对导入不处理：解析规则不同，且仓库里几乎不用
            if not node.module:
                continue

            target = resolve(root, node.module)
            if target is None or target == path:
                continue

            if target not in cache:
                try:
                    cache[target] = module_exports(
                        ast.parse(target.read_text(encoding="utf-8"))
                    )
                except SyntaxError:
                    cache[target] = (set(), True)
            exported, opaque = cache[target]
            if opaque:
                continue

            for alias in node.names:
                if alias.name == "*":
                    continue
                if alias.name in exported:
                    continue
                # 也可能是子模块：from data.sql import base
                if resolve(root, f"{node.module}.{alias.name}") is not None:
                    continue
                problems.append(
                    f"{path.relative_to(REPO)}:{node.lineno}: "
                    f"from {node.module} import {alias.name} —— "
                    f"{target.relative_to(REPO)} 里没有这个名字"
                )

    return problems


def main() -> int:
    all_problems: list[str] = []
    for service in SERVICE_ROOTS:
        all_problems.extend(check_service(service))

    if all_problems:
        print(f"发现 {len(all_problems)} 处导入的名字并不存在：\n")
        for line in all_problems:
            print(f"  {line}")
        print(
            "\n这类问题会让服务在启动时直接 ImportError —— compileall 只编译不导入，"
            "\n单元测试又常把相关模块顶成替身，两者都看不见。"
        )
        return 1

    print("导入检查通过：所有 `from <本仓库模块> import <名字>` 都能对上")
    return 0


if __name__ == "__main__":
    sys.exit(main())
