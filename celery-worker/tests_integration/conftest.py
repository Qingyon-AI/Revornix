"""集成测试：真的连依赖。

与 `tests/` 是**两套东西**，刻意分开放：

- `tests/` 把外部系统顶成替身，零依赖、秒级，每个 PR 都跑；
- 这里连真的 Postgres / Neo4j / Milvus，分钟级，单独触发。

分目录而不是分 marker，是因为 `tests/conftest.py` 的替身是**进程级**的：同一次
运行里既顶掉 `data.milvus.insert` 又要用真的，不可能。`pytest.ini` 的
`testpaths = tests` 保证这里不会被默认收集。

## 开关语义

要显式设 `REVORNIX_INTEGRATION=1` 才跑；没设就整目录跳过。但**一旦设了，连不上
就是失败，不是跳过** —— 这是刻意的：CI 里那个 job 会设这个变量，此时容器没起来
必须红，否则"集成测试通过"会变成一句空话，而它恰恰是最容易空转的一类测试。

（这和 `scripts/check-all.sh` 里那条注释是同一个教训：一个会漏报的检查比没有
更危险。那次是把真实失败吞成了跳过。）
"""

from __future__ import annotations

import os

import pytest

INTEGRATION_ENABLED = os.environ.get("REVORNIX_INTEGRATION") == "1"

# 连接信息。默认值对齐 docker-compose-local.yaml，本地起了那套就能直接跑。
DEFAULTS = {
    "POSTGRES_USER": "postgres",
    "POSTGRES_PASSWORD": "postgres",
    "POSTGRES_DB": "revornix",
    "POSTGRES_DB_URL": "localhost:5432",
    "NEO4J_URI": "bolt://localhost:7687",
    "NEO4J_USER": "neo4j",
    "NEO4J_PASS": "neo4jneo4j",
    "MILVUS_CLUSTER_ENDPOINT": "http://localhost:19530",
    "MILVUS_TOKEN": "",
}

for _key, _value in DEFAULTS.items():
    os.environ.setdefault(_key, _value)

# 这些模块在导入期校验密钥，与 tests/conftest.py 同一堵墙。
os.environ.setdefault("OAUTH_SECRET_KEY", "revornix-integration-secret")
os.environ.setdefault("LANGFUSE_PUBLIC_KEY", "revornix-integration-public")
os.environ.setdefault("LANGFUSE_SECRET_KEY", "revornix-integration-secret")


# 不需要外部系统的用例：只要装了依赖就该跑，不受开关影响。
# 目前只有导入冒烟测试 —— 它验的恰恰是"模块能不能加载"，而那次事故里
# 正是没有任何东西做过这件事。
_NO_INFRA_NEEDED = ("test_entrypoint_imports",)


def pytest_collection_modifyitems(config, items):
    if INTEGRATION_ENABLED:
        return
    skip = pytest.mark.skip(
        reason="需要真实依赖，设 REVORNIX_INTEGRATION=1 并起好 "
        "docker-compose-local.yaml 里的存储后再跑"
    )
    for item in items:
        if any(name in item.nodeid for name in _NO_INFRA_NEEDED):
            continue
        item.add_marker(skip)


@pytest.fixture(scope="session")
def milvus_client():
    """真实 Milvus 客户端，并保证集合已建好。

    建集合用的是**生产那段代码**（`init_document_collection`），不是测试里另写
    一份 schema —— 否则测的就是测试自己的集合定义，而真实定义改了不会有人知道。
    """
    import asyncio

    from data.milvus.base import milvus_client as client
    from data.milvus.base import MILVUS_COLLECTION
    from data.milvus.create import init_document_collection

    # 主动探一次连接：否则第一个断言会以一个含混的超时形式失败，
    # 排查时看不出是"没起容器"还是"代码错了"。
    client.list_collections()

    if not client.has_collection(MILVUS_COLLECTION):
        asyncio.get_event_loop_policy().new_event_loop().run_until_complete(
            init_document_collection()
        )
    client.load_collection(MILVUS_COLLECTION)
    return client


@pytest.fixture(scope="session", autouse=True)
def _tables_exist():
    """建表。

    worker 侧的 `models` 是 api 的子集，所以这里只保证本目录用例要用到的表存在；
    schema_guard 本身只做"补列"，不建表 —— 分工与线上一致（建表由 api 启动时做）。
    """
    if not INTEGRATION_ENABLED:
        return
    import models  # noqa: F401  —— 导入即注册到 metadata
    from data.sql.base import Base, engine

    Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="session")
def neo4j_driver():
    from data.neo4j.base import async_neo4j_driver

    return async_neo4j_driver
