from contextlib import asynccontextmanager

from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from config.sql import POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_DB_URL, POSTGRES_USER

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_DB_URL}/{POSTGRES_DB}"

# 同步 engine：只给 schema_guard 用。它跑在 worker_init 信号里 —— 那时还没有
# 事件循环，用不了 async_engine，而 DDL 本来也不需要异步。
#
# 这个东西曾经**不存在**：schema_guard 是 api/worker 的镜像文件，里面
# `from data.sql.base import engine`，api 侧有、worker 侧没有。于是 worker 的
# common/celery/app.py 一导入就 ImportError —— 整个 worker 起不来。
# compileall 只编译不导入，单测又把 data.sql.base 顶成了替身，所以两道检查都没看见。
# tests_integration 里那条导入冒烟测试就是为这个加的。
engine = create_sqlalchemy_engine(
    SQLALCHEMY_DATABASE_URL,
    # 与 async_engine 同理：这条连接只在启动时用一次，不必留着占池子。
    poolclass=NullPool,
    pool_pre_ping=True,
    echo=False,
)

# NullPool on purpose: every celery task drives its coroutines on a fresh
# event loop (common/celery/app.py::_run -> asyncio.run), but pooled async
# connections are bound to the loop that created them. Reusing a pooled
# connection from a previous task's (already closed) loop raises
# "attached to a different loop" errors or hangs. NullPool opens a real
# connection per checkout and closes it on release, so connections never
# outlive their loop.
async_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
)

async_session_scope = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@asynccontextmanager
async def async_session_context():
    session = async_session_scope()
    try:
        yield session
    finally:
        await session.close()

Base = declarative_base()
