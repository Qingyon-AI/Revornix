from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from config.sql import POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_DB_URL, POSTGRES_USER

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_DB_URL}/{POSTGRES_DB}"

async_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    max_overflow=30,
    pool_size=30,
    pool_timeout=10,
    pool_recycle=1800,
    pool_pre_ping=True,
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
