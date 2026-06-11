from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from config.sql import POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_DB_URL, POSTGRES_USER

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_DB_URL}/{POSTGRES_DB}"

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
