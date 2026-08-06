"""auth_epoch 失效判定：布尔版与抛异常版必须永远一致。

`is_auth_epoch_stale`(common/auth_token.py) 是判定本身，零 FastAPI 依赖；
api 侧的 `_reject_if_stale_auth_epoch` 调它，再把结果翻译成 401。两份实现分处
两个模块、服务于两种调用风格，正是那种"改一处忘一处"的形状 —— 而它管的是
**登录态失效**，改错的后果是已登出的 token 继续可用。

这个模块被拆出来的直接原因是一次真实故障：`common/plan_access.py` 曾经直接调
api 侧那个抛 HTTPException 的版本，再把异常吞掉当布尔值用。但那个模块的存在意义
就是"零 fastapi"（worker 没装 fastapi），于是它引用了一个自己根本 import 不到的
名字 —— 静态上是 NameError，运行时表现为接口返回 500，
`name 'format_log_message' is not defined` 那一批里的一个。
"""

from types import SimpleNamespace

import pytest

from common.auth_token import is_auth_epoch_stale


# (token 里的 payload, 用户当前 auth_epoch, 是否应判为失效, 说明)
CASES = [
    ({"auth_epoch": 3}, 3, False, "相同 epoch 放行"),
    ({"auth_epoch": 2}, 3, True, "token 落后于用户，拒绝"),
    ({}, 0, False, "两侧都缺省为 0，放行"),
    ({}, 5, True, "老 token 没有该字段，而用户已递增过 —— 必须拒绝"),
    ({"auth_epoch": 5}, 0, True, "token 超前，同样拒绝"),
    ({"auth_epoch": None}, 0, False, "显式 None 按 0 处理"),
    ({"auth_epoch": None}, 2, True, "显式 None 按 0 处理，用户已递增则拒绝"),
]


@pytest.mark.parametrize("payload,user_epoch,expected,desc", CASES)
def test_is_auth_epoch_stale(payload, user_epoch, expected, desc):
    user = SimpleNamespace(auth_epoch=user_epoch)
    assert is_auth_epoch_stale(payload=payload, user=user) is expected, desc


def test_missing_field_with_nonzero_user_epoch_is_stale():
    """单独钉住最容易被"优化"掉的一条。

    缺字段按 0 处理，看着像个可以省略的边界；省掉它（比如改成"缺字段就放行"），
    所有**在 auth_epoch 机制上线前签发的 token** 会永久有效 —— 包括本该因为改密码
    而失效的那些。这条红，说明那个默认值被动过。
    """
    assert is_auth_epoch_stale(payload={}, user=SimpleNamespace(auth_epoch=1)) is True


def test_auth_token_module_is_fastapi_free():
    """这个模块一旦 import 了 fastapi，worker 就会起不到。

    worker 的镜像里没有 fastapi（pyproject 里没声明），而它要用 plan_access，
    plan_access 又要用这里。本地开发看不出问题：一个 workspace 共用一个 .venv，
    `uv sync --all-packages` 把 fastapi 也装上了，所以**边界只有容器能验证**。
    这条用静态方式钉住，不依赖运行环境。
    """
    import ast
    import pathlib

    import common.auth_token as mod

    tree = ast.parse(pathlib.Path(mod.__file__).read_text(encoding="utf-8"))
    imported_roots = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported_roots.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            imported_roots.add(node.module.split(".")[0])

    assert "fastapi" not in imported_roots, (
        "common/auth_token.py 不能依赖 fastapi —— worker 镜像里没有它。"
        f"当前 import 的顶层模块：{sorted(imported_roots)}"
    )
