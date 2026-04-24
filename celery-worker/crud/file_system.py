import models
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

def get_file_system_by_id(
    db: Session, 
    file_system_id: int
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.id == file_system_id,
                         models.file_system.FileSystem.delete_at.is_(None))
    return query.one_or_none()

def get_user_file_system_by_id(
    db: Session, 
    user_file_system_id: int
):
    query = db.query(models.file_system.UserFileSystem)
    query = query.join(models.file_system.FileSystem)
    query = query.filter(models.file_system.UserFileSystem.id == user_file_system_id,
                         models.file_system.UserFileSystem.delete_at.is_(None),
                         models.file_system.FileSystem.delete_at.is_(None))
    return query.one_or_none()


async def get_file_system_by_id_async(
    db: AsyncSession,
    file_system_id: int,
):
    stmt = select(models.file_system.FileSystem).where(
        models.file_system.FileSystem.id == file_system_id,
        models.file_system.FileSystem.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_user_file_system_by_id_async(
    db: AsyncSession,
    user_file_system_id: int,
):
    stmt = (
        select(models.file_system.UserFileSystem)
        .join(models.file_system.FileSystem)
        .where(
            models.file_system.UserFileSystem.id == user_file_system_id,
            models.file_system.UserFileSystem.delete_at.is_(None),
            models.file_system.FileSystem.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_file_systems_by_ids_async(
    db: AsyncSession,
    file_system_ids: list[int],
):
    if not file_system_ids:
        return []
    stmt = select(models.file_system.FileSystem).where(
        models.file_system.FileSystem.id.in_(file_system_ids),
        models.file_system.FileSystem.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_user_file_systems_by_ids_async(
    db: AsyncSession,
    user_file_system_ids: list[int],
):
    if not user_file_system_ids:
        return []
    stmt = (
        select(models.file_system.UserFileSystem)
        .join(models.file_system.FileSystem)
        .where(
            models.file_system.UserFileSystem.id.in_(user_file_system_ids),
            models.file_system.UserFileSystem.delete_at.is_(None),
            models.file_system.FileSystem.delete_at.is_(None),
        )
    )
    return list((await db.execute(stmt)).scalars().all())
