"""启动时的表结构自愈（已装机的那一半迁移）。

**运行时不跑迁移框架。** 表结构由两件事共同确定：`Base.metadata.create_all`
（`data/sql/create.py`）建出新装机需要的全部表，本文件的一串 `_migrate_*` 给
**已装机**补上 `create_all` 不会施加到既有表上的变更（加列、回填）。API 与 celery
worker 启动时各跑一遍，谁先起来都行。

仓库里一度用 alembic，但迁移脚本从不入库（`.gitignore` 忽略 `versions/*.py`），
每个部署各自 `autogenerate` 出自己的链、revision id 互不相同 —— 没有任何一条能被
共享，手写一条反而会在别的机器上因为 `down_revision` 找不到而崩。实际效果就是
「模型加了一列，每台机器都得有人手动去迁移，漏跑就 500 在缺列上」，所以整套换成
了这里的启动自愈。

**改表结构因此是两步**：

1. 改 `models/*.py` —— 新装机由 `create_all` 从这里得到正确结构；
2. 加一个 `_migrate_*` 并挂进 `run_schema_guard()` —— 已装机由此跟上。

只做第 1 步的话，新装机正常、老用户升级后崩在缺列上。

约定：

- DDL 必须幂等（`ADD COLUMN IF NOT EXISTS`），整个流程还包在一把 advisory lock 里，
  多副本同时启动不会互相踩到；
- 表还不存在时跳过 —— 全新库此刻什么都没建，随后由 `create_all` 按模型一次建对；
- 一个 `_migrate_*` 在它保护的最早版本不再需要支持时就可以删掉。

这份文件在 `api/` 与 `celery-worker/` 各有一份，必须保持一致。
"""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

from common.logger import exception_logger, info_logger
from data.sql.base import engine

# 任取的常量，只要两个服务用同一个值即可：它是「正在跑表结构自愈」这件事的锁。
_SCHEMA_GUARD_LOCK_KEY = 0x5265_766F  # "Revo"

TASK_DETAIL_TABLES = (
    "document_audio_transcribe_task",
    "document_convert_to_md_task",
    "document_summarize_task",
    "document_embedding_task",
    "document_graph_task",
    "document_podcast_task",
    "document_process_task",
    "section_process_task",
    "section_podcast_task",
)

_TASK_DETAIL_COMMENT = (
    "Human readable detail of the current status, e.g. the error message when "
    "the task failed"
)


def _table_names(conn: Connection) -> set[str]:
    return set(inspect(conn).get_table_names())


def _add_column(
    conn: Connection,
    *,
    table: str,
    column: str,
    ddl_type: str,
    comment: str | None = None,
) -> bool:
    """给既有表补一列。返回是否真的加了（用于日志）。"""
    columns = {item["name"] for item in inspect(conn).get_columns(table)}
    if column in columns:
        return False
    conn.execute(
        text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{column}" {ddl_type}')
    )
    if comment is not None:
        # COMMENT ON 是 DDL，不接受绑定参数，只能内联字面量。注释是代码里的常量，
        # 转义单引号是为了让「以后有人写了带撇号的注释」不至于变成语法错误。
        escaped = comment.replace("'", "''")
        conn.execute(text(f"COMMENT ON COLUMN \"{table}\".\"{column}\" IS '{escaped}'"))
    return True


def _migrate_task_detail(conn: Connection, tables: set[str]) -> None:
    """每个文档 / 专栏任务节点补 `detail` 列 —— 失败原因记在任务自己身上。

    这列之前，文档处理链路上任何一个节点抛错都会把 `Error: ...` 写进
    `document.title` 和 `document.description`（典型是知识图谱失败），一个节点出错
    毁掉整份文档的元数据。现在错误落在出错的那个任务行上，前端在对应任务卡片里展示。

    可空：老任务行没有这个信息，留空即可，卡片就只显示状态。
    """
    patched = [
        table
        for table in TASK_DETAIL_TABLES
        if table in tables
        and _add_column(
            conn,
            table=table,
            column="detail",
            ddl_type="VARCHAR(1000)",
            comment=_TASK_DETAIL_COMMENT,
        )
    ]
    if patched:
        info_logger.warning(f"schema_guard: added `detail` column to {patched}")


def run_schema_guard() -> None:
    """跑一遍全部 `_migrate_*`。幂等，可以在每次进程启动时无条件调用。

    结构缺失会让服务在第一个请求上就崩，所以这里不吞异常 —— 起不来比带着半张表
    跑起来好排查。
    """
    try:
        with engine.begin() as conn:
            # 同一时刻只允许一个进程改结构；事务结束自动释放。
            conn.execute(
                text("SELECT pg_advisory_xact_lock(:key)"),
                {"key": _SCHEMA_GUARD_LOCK_KEY},
            )
            tables = _table_names(conn)
            if not tables:
                # 全新库，什么都还没建 —— 交给 create_all 按模型一次建对。
                info_logger.warning("schema_guard: empty database, nothing to patch")
                return
            _migrate_task_detail(conn, tables)
    except Exception as e:
        exception_logger.exception(f"schema_guard failed: {e}")
        raise
