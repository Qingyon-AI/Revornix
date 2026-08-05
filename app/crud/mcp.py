from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import models


def create_mcp_server_base(
    db: Session,
    user_id: int,
    name: str,
    category: int
):
    now = datetime.now(timezone.utc)
    db_mcp_server = models.mcp.MCPServer(
        name=name,
        category=category,
        user_id=user_id,
        enable=True,
        create_time=now
    )
    db.add(db_mcp_server)
    db.flush()
    return db_mcp_server


async def create_mcp_server_base_async(
    db: AsyncSession,
    user_id: int,
    name: str,
    category: int,
):
    now = datetime.now(timezone.utc)
    db_mcp_server = models.mcp.MCPServer(
        name=name,
        category=category,
        user_id=user_id,
        enable=True,
        create_time=now,
    )
    db.add(db_mcp_server)
    await db.flush()
    return db_mcp_server

def create_std_mcp(
    db: Session,
    server_id: int,
    cmd: str,
    args: str | None = None,
    env: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_std_mcp = models.mcp.StdMCP(
        server_id=server_id,
        cmd=cmd,
        args=args,
        env=env,
        create_time=now
    )
    db.add(db_std_mcp)
    db.flush()
    return db_std_mcp


async def create_std_mcp_async(
    db: AsyncSession,
    server_id: int,
    cmd: str,
    args: str | None = None,
    env: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_std_mcp = models.mcp.StdMCP(
        server_id=server_id,
        cmd=cmd,
        args=args,
        env=env,
        create_time=now,
    )
    db.add(db_std_mcp)
    await db.flush()
    return db_std_mcp

def create_http_mcp(
    db: Session,
    server_id: int,
    url: str,
    headers: str | None = None
):
    now = datetime.now(timezone.utc)
    db_http_mcp = models.mcp.HttpMCP(
        url=url,
        server_id=server_id,
        headers=headers,
        create_time=now
    )
    db.add(db_http_mcp)
    db.flush()
    return db_http_mcp


async def create_http_mcp_async(
    db: AsyncSession,
    server_id: int,
    url: str,
    headers: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_http_mcp = models.mcp.HttpMCP(
        url=url,
        server_id=server_id,
        headers=headers,
        create_time=now,
    )
    db.add(db_http_mcp)
    await db.flush()
    return db_http_mcp

def search_mcp_servers(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.user_id == user_id,
                         models.mcp.MCPServer.delete_at.is_(None))
    query = query.order_by(models.mcp.MCPServer.id.desc())
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.mcp.MCPServer.name.like(f'%{keyword}%'))
    return query.all()


async def search_mcp_servers_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        select(models.mcp.MCPServer)
        .where(
            models.mcp.MCPServer.user_id == user_id,
            models.mcp.MCPServer.delete_at.is_(None),
        )
        .order_by(models.mcp.MCPServer.id.desc())
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.mcp.MCPServer.name.like(f'%{keyword}%'))
    return list((await db.execute(stmt)).scalars().all())

def get_base_mcp_server_by_id(
    db: Session,
    id: int
):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == id,
                         models.mcp.MCPServer.delete_at.is_(None))
    return query.one_or_none()


async def get_base_mcp_server_by_id_async(
    db: AsyncSession,
    id: int,
):
    stmt = select(models.mcp.MCPServer).where(
        models.mcp.MCPServer.id == id,
        models.mcp.MCPServer.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_std_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    query = db.query(models.mcp.StdMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.StdMCP.delete_at.is_(None),
                         models.mcp.MCPServer.delete_at.is_(None))
    return query.one_or_none()


async def get_std_mcp_server_by_base_server_id_async(
    db: AsyncSession,
    base_server_id: int,
):
    stmt = (
        select(models.mcp.StdMCP)
        .join(models.mcp.MCPServer)
        .where(
            models.mcp.MCPServer.id == base_server_id,
            models.mcp.StdMCP.delete_at.is_(None),
            models.mcp.MCPServer.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_std_mcp_servers_by_base_server_ids_async(
    db: AsyncSession,
    base_server_ids: list[int],
):
    if not base_server_ids:
        return []
    stmt = (
        select(models.mcp.StdMCP)
        .where(
            models.mcp.StdMCP.server_id.in_(base_server_ids),
            models.mcp.StdMCP.delete_at.is_(None),
        )
    )
    return list((await db.execute(stmt)).scalars().all())

def get_http_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    query = db.query(models.mcp.HttpMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.HttpMCP.delete_at.is_(None),
                         models.mcp.MCPServer.delete_at.is_(None))
    return query.one_or_none()


async def get_http_mcp_server_by_base_server_id_async(
    db: AsyncSession,
    base_server_id: int,
):
    stmt = (
        select(models.mcp.HttpMCP)
        .join(models.mcp.MCPServer)
        .where(
            models.mcp.MCPServer.id == base_server_id,
            models.mcp.HttpMCP.delete_at.is_(None),
            models.mcp.MCPServer.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_http_mcp_servers_by_base_server_ids_async(
    db: AsyncSession,
    base_server_ids: list[int],
):
    if not base_server_ids:
        return []
    stmt = (
        select(models.mcp.HttpMCP)
        .where(
            models.mcp.HttpMCP.server_id.in_(base_server_ids),
            models.mcp.HttpMCP.delete_at.is_(None),
        )
    )
    return list((await db.execute(stmt)).scalars().all())

def delete_base_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    query = db.query(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.MCPServer.delete_at.is_(None))
    query.update({models.mcp.MCPServer.delete_at: datetime.now(timezone.utc)})
    db.flush()


async def delete_base_mcp_server_by_base_server_id_async(
    db: AsyncSession,
    base_server_id: int,
):
    db_mcp_server = await get_base_mcp_server_by_id_async(
        db=db,
        id=base_server_id,
    )
    if db_mcp_server is None:
        return
    db_mcp_server.delete_at = datetime.now(timezone.utc)
    await db.flush()

def delete_http_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.mcp.HttpMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.HttpMCP.delete_at.is_(None),
                         models.mcp.MCPServer.delete_at.is_(None))
    http_mcp_server = query.one_or_none()
    if http_mcp_server is not None:
        http_mcp_server.delete_at = now
        db.flush()


async def delete_http_mcp_server_by_base_server_id_async(
    db: AsyncSession,
    base_server_id: int,
):
    now = datetime.now(timezone.utc)
    http_mcp_server = await get_http_mcp_server_by_base_server_id_async(
        db=db,
        base_server_id=base_server_id,
    )
    if http_mcp_server is not None:
        http_mcp_server.delete_at = now
        await db.flush()

def delete_std_mcp_server_by_base_server_id(
    db: Session,
    base_server_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.mcp.StdMCP)
    query = query.join(models.mcp.MCPServer)
    query = query.filter(models.mcp.MCPServer.id == base_server_id,
                         models.mcp.StdMCP.delete_at.is_(None),
                         models.mcp.MCPServer.delete_at.is_(None))
    std_mcp_server = query.one_or_none()
    if std_mcp_server is not None:
        std_mcp_server.delete_at = now
        db.flush()


async def delete_std_mcp_server_by_base_server_id_async(
    db: AsyncSession,
    base_server_id: int,
):
    now = datetime.now(timezone.utc)
    std_mcp_server = await get_std_mcp_server_by_base_server_id_async(
        db=db,
        base_server_id=base_server_id,
    )
    if std_mcp_server is not None:
        std_mcp_server.delete_at = now
        await db.flush()
