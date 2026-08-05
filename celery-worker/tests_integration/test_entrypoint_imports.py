"""入口模块能不能被导入。

这条用例存在，是因为一个**已经发生过**的事故：`data/sql/schema_guard.py` 是
api/worker 的镜像文件（CI 强制两侧逐字节相同），里面写着
`from data.sql.base import engine`。api 侧有这个 `engine`，worker 侧没有。

于是 `common/celery/app.py` —— 定义 `celery_app`、每个任务都要导入的那个模块 ——
一导入就 ImportError，**整个 worker 起不来**。

两道现有检查都没看见它：

- `compileall` 只编译不导入，语法没问题就过；
- 单元测试把 `data.sql.base` 顶成了替身，压根到不了真实那行。

所以这里不断言任何行为，只做一件事：**真的 import 一遍**。它不需要任何外部
系统（`create_engine` 不会立刻连库），因此在 `REVORNIX_INTEGRATION` 没开时
也照跑 —— 见 conftest 里的豁免。

镜像文件这个机制本身是有代价的：它保证两侧一致，但**一致不等于两侧都能用**。
这类"在 A 侧成立、搬到 B 侧不成立"的依赖，只有真导入才发现得了。
"""

from __future__ import annotations

import importlib

import pytest

# worker 真正的入口。celery 起 worker 时第一件事就是导入它。
ENTRYPOINTS = [
    "common.celery.app",
    "data.sql.schema_guard",
    "data.sql.base",
]


@pytest.mark.parametrize("module", ENTRYPOINTS)
def test_entrypoint_is_importable(module):
    importlib.import_module(module)


def test_schema_guard_gets_a_sync_engine():
    """把那次事故的具体形态钉住。

    schema_guard 跑在 `worker_init` 信号里 —— 那时还没有事件循环，用不了
    `async_engine`。所以 worker 侧必须有一个同步 `engine`，不是可选项。
    """
    from data.sql.base import engine
    from sqlalchemy.engine import Engine

    assert isinstance(engine, Engine)
