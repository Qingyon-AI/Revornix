"""torch 必须是可选依赖 —— 用静态检查钉住。

生产走云端 embedding（`ALI_DASHSCOPE_EMBEDDING_ON=True`），`LocalQwen3EmbeddingEngine`
一次都不执行。但它此前被 `engine/__init__.py` 在**模块顶层** import，于是
`import engine`（几乎每条链路都会走到）就把 torch 拉了进来 —— wheel 527 MB、
装完约 1.3 GB，每台机器、每个镜像、每次构建都在为一个永不执行的分支付钱。

这条不变量很容易被无意破坏：有人为了方便在 `engine/__init__.py` 里补一行导出，
或者把 factory 的延迟 import 提到顶层，torch 就又回来了 —— **而且不会有任何
报错**，只是所有部署重新变大 1.3 GB，谁也不会注意到。

所以这里不导入任何东西，只做 AST 检查：`engine` 包的顶层、以及 factory 的
模块顶层，都不许出现通向 `qwen_local` 的 import。零依赖，两侧一起查。
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
# engine 已经合并进 app/ —— 只有一份了。
# 这里刻意**不写 pytest.skip**：文件找不到就该红。此前用 skip 兜底，结果 engine
# 搬走之后这几条静静地全跳过了，看起来一切正常。
ENGINE_INIT = REPO / "app" / "engine" / "__init__.py"
FACTORY = REPO / "app" / "engine" / "embedding" / "factory.py"
SERVICES = ["api", "worker"]


def module_level_imports(path: Path) -> list[str]:
    """只取**模块顶层**的 import；函数体内的延迟 import 不算。"""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: list[str] = []
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module:
            found.append(node.module)
            found.extend(f"{node.module}.{a.name}" for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level:
            found.extend(a.name for a in node.names)
        elif isinstance(node, ast.Import):
            found.extend(a.name for a in node.names)
    return found


def relative_from_imports(path: Path) -> list[str]:
    """`from .embedding.qwen_local import X` 这种相对导入。"""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    return [
        node.module
        for node in tree.body
        if isinstance(node, ast.ImportFrom) and node.level and node.module
    ]


def test_engine_package_does_not_pull_the_local_engine():
    path = ENGINE_INIT
    assert path.is_file(), f"{path} 不存在 —— engine 包被移动了？"

    reached = module_level_imports(path) + relative_from_imports(path)
    offenders = [m for m in reached if "qwen_local" in m]
    assert not offenders, (
        f"app/engine/__init__.py 在顶层导入了 {offenders} —— "
        "这会让 `import engine` 连带装载 torch（约 1.3 GB），"
        "而默认配置走云端 embedding，那段代码一次都不会执行。"
    )


def test_factory_imports_the_local_engine_lazily():
    path = FACTORY
    assert path.is_file(), f"{path} 不存在 —— factory 被移动了？"

    top = module_level_imports(path)
    assert not [m for m in top if "qwen_local" in m], (
        "factory 在模块顶层导入了本地引擎；应当放进分支内部，"
        "只有真正选中本地引擎时才 import。"
    )

    # 反过来也要确认它**确实**还能拿到本地引擎 —— 否则这条测试可以靠
    # "把功能删掉" 来通过。
    source = path.read_text(encoding="utf-8")
    assert "qwen_local" in source, "factory 已经完全不引用本地引擎了"


@pytest.mark.parametrize("service", SERVICES)
def test_torch_is_not_a_default_dependency(service):
    """torch 只能出现在 optional-dependencies 里。

    迁到 uv workspace 之后判据也换了：从前查的是 requirements.txt 有没有那一行，
    现在查 pyproject 的 [project.dependencies] 与 [project.optional-dependencies]。
    上一版仍指着已删除的 requirements.txt —— 那会在文件消失后变成一条永远失败
    （或者更糟：被改成 skip 而永远沉默）的用例。
    """
    import tomllib

    data = tomllib.loads((REPO / service / "pyproject.toml").read_text(encoding="utf-8"))
    project = data["project"]

    runtime = " ".join(project.get("dependencies", []))
    assert "torch" not in runtime, (
        f"{service}/pyproject.toml 的 dependencies 里出现了 torch —— "
        "它属于 optional-dependencies，默认部署走云端 embedding 不需要它。"
    )

    optional = project.get("optional-dependencies", {})
    assert "local-embedding" in optional, f"{service} 少了 local-embedding 这一组"
    assert any("torch" in d for d in optional["local-embedding"])


def test_the_shared_package_does_not_depend_on_torch():
    """app/ 是两个入口都装的，torch 混进这里等于谁都躲不掉。"""
    import tomllib

    data = tomllib.loads((REPO / "app" / "pyproject.toml").read_text(encoding="utf-8"))
    assert "torch" not in " ".join(data["project"].get("dependencies", []))
