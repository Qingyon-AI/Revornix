from contextlib import asynccontextmanager

from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from config.sql import POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_DB_URL, POSTGRES_USER

SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_DB_URL}/{POSTGRES_DB}"

engine = create_sqlalchemy_engine(
    SQLALCHEMY_DATABASE_URL,
    max_overflow=30, # 超过连接池大小之后，允许最大扩展连接数；
    pool_size=30,    # 连接池的大小
    pool_timeout=10,# 连接池如果没有连接了，最长的等待时间
    pool_recycle=1800, # 多久之后对连接池中连接进行一次回收
    pool_pre_ping=True,    # ✅ 必加
    echo=False
)

session_scope = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
