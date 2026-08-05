"""把数据库带到「可用」状态。启动时自动跑，不需要任何人手动操作数据库。

三步，顺序固定，每一步都幂等：

1. **建表** —— `Base.metadata.create_all`。新装机由此得到全部表；已装机只补上
   这个版本新增的表，已存在的表原样跳过。
2. **补列 / 回填** —— `schema_guard` 里的一串 `_migrate_*`。`create_all` 不会给
   **已存在**的表加列，这一步专门管这件事。
3. **种子数据** —— `seed_database`。内置文件系统、引擎、通知源 / 模板、root 用户。
   新版本新增的内置项也靠它补进老库，所以每次启动都要跑，不只是首次安装。

**为什么建表只在 API 里跑。** `worker/models/` 是 `api/models/` 的一个子集
（没有 access_request、mcp 等），拿它 `create_all` 会建出一份缺表的库。所以表的
权威只有 API 一家；worker 启动时只跑第 2 步 —— 那些 `_migrate_*` 是写死的 DDL，
不依赖 metadata 完整，表还不存在时会自己跳过。谁先起来都不会坏。

失败就抛，不吞：带着半张表或没有 root 用户跑起来，比起不来更难查。
"""

from __future__ import annotations

from importlib import import_module

from sqlalchemy import inspect

from common.logger import info_logger
from models.base import Base
from data.sql.base import async_session_context, engine
from data.sql.schema_guard import run_schema_guard


#: `create_all` 只建它见过的表 —— 模型模块没被导入，它声明的表就会被静默漏掉。
#: 新增 `models/*.py` 时必须往这里加一行，否则新表在全新安装上根本不会出现。
_MODEL_MODULES = (
    "access_request",
    "api_key",
    "document",
    "engine",
    "file_system",
    "mcp",
    "model",
    "notification",
    "section",
    "task",
    "usage",
    "user",
)


def _ensure_tables() -> None:
    """建出模型声明的全部表。幂等：已存在的表不会被重建，也不会丢数据。"""
    # 导入即注册到 Base.metadata；延迟到函数里，好让本模块可以被随便 import。
    for name in _MODEL_MODULES:
        import_module(f"models.{name}")

    missing = set(Base.metadata.tables) - set(inspect(engine).get_table_names())
    Base.metadata.create_all(bind=engine)
    if missing:
        info_logger.warning(f"bootstrap: created {len(missing)} table(s): {sorted(missing)}")


async def _ensure_seed() -> None:
    """补齐内置数据。每个 create 都带存在性检查，重复跑不会产生重复行。"""
    # 延迟导入：data.sql.create 在模块顶层校验 ROOT_USER_* 并加载全部引擎实现，
    # 不该只因为「有人 import 了 bootstrap」就触发。
    from data.sql.create import seed_database

    async with async_session_context() as db:
        await seed_database(db=db)
        await db.commit()


async def ensure_database_ready() -> None:
    """建表 → 补列 → 补种子数据。每次进程启动无条件调用。"""
    info_logger.warning("bootstrap: ensuring tables...")
    _ensure_tables()
    run_schema_guard()
    info_logger.warning("bootstrap: schema ready, seeding...")
    await _ensure_seed()
    info_logger.warning("bootstrap: database ready")
