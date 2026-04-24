from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import models
from common.encrypt import encrypt_file_system_config


def create_file_system(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_file_system = models.file_system.FileSystem(uuid=uuid,
                                                   name=name,
                                                   name_zh=name_zh,
                                                   description=description,
                                                   description_zh=description_zh,
                                                   create_time=now)
    db.add(db_file_system)
    db.flush()
    return db_file_system

async def create_file_system_async(
    db: AsyncSession,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_file_system = models.file_system.FileSystem(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now,
    )
    db.add(db_file_system)
    await db.flush()
    return db_file_system

def create_user_file_system(
    db: Session,
    user_id: int,
    file_system_id: int,
    title: str | None = None,
    description: str | None = None,
    config_json: str | None = None
):
    now = datetime.now(timezone.utc)
    if config_json is not None:
        config_json = encrypt_file_system_config(config_json)
    db_file_system_user = models.file_system.UserFileSystem(
        file_system_id=file_system_id,
        user_id=user_id,
        title=title,
        description=description,
        config_json=config_json,
        create_time=now
    )
    db.add(db_file_system_user)
    db.flush()
    return db_file_system_user

async def create_user_file_system_async(
    db: AsyncSession,
    user_id: int,
    file_system_id: int,
    title: str | None = None,
    description: str | None = None,
    config_json: str | None = None
):
    now = datetime.now(timezone.utc)
    if config_json is not None:
        config_json = encrypt_file_system_config(config_json)
    db_file_system_user = models.file_system.UserFileSystem(
        file_system_id=file_system_id,
        user_id=user_id,
        title=title,
        description=description,
        config_json=config_json,
        create_time=now
    )
    db.add(db_file_system_user)
    await db.flush()
    return db_file_system_user

def get_all_file_systems(
    db: Session,
    keyword: str | None = None
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.file_system.FileSystem.name.like(f'%{keyword}%'))
    return query.all()

async def get_all_file_systems_async(
    db: AsyncSession,
    keyword: str | None = None
):
    stmt = select(models.file_system.FileSystem).where(
        models.file_system.FileSystem.delete_at.is_(None)
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.file_system.FileSystem.name.like(f'%{keyword}%'))
    result = await db.execute(stmt)
    return result.scalars().all()

def get_file_system_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.uuid == uuid,
                         models.file_system.FileSystem.delete_at.is_(None))
    return query.one_or_none()

async def get_file_system_by_uuid_async(
    db: AsyncSession,
    uuid: str
):
    result = await db.execute(
        select(models.file_system.FileSystem).where(
            models.file_system.FileSystem.uuid == uuid,
            models.file_system.FileSystem.delete_at.is_(None),
        )
    )
    return result.scalar_one_or_none()

def get_user_file_systems_by_user_id(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.file_system.UserFileSystem, models.file_system.FileSystem)
    query = query.join(models.file_system.FileSystem)
    query = query.filter(models.file_system.UserFileSystem.user_id == user_id,
                         models.file_system.UserFileSystem.delete_at.is_(None),
                         models.file_system.FileSystem.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.file_system.FileSystem.name.like(f'%{keyword}%'))
    query = query.order_by(models.file_system.UserFileSystem.create_time)
    return query.all()

async def get_user_file_systems_by_user_id_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None
):
    stmt = (
        select(models.file_system.UserFileSystem, models.file_system.FileSystem)
        .join(models.file_system.FileSystem)
        .where(
            models.file_system.UserFileSystem.user_id == user_id,
            models.file_system.UserFileSystem.delete_at.is_(None),
            models.file_system.FileSystem.delete_at.is_(None),
        )
        .order_by(models.file_system.UserFileSystem.create_time)
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.file_system.FileSystem.name.like(f'%{keyword}%'))
    result = await db.execute(stmt)
    return result.all()

def get_file_system_by_id(
    db: Session,
    file_system_id: int
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.id == file_system_id,
                         models.file_system.FileSystem.delete_at.is_(None))
    return query.one_or_none()

async def get_file_system_by_id_async(
    db: AsyncSession,
    file_system_id: int
):
    result = await db.execute(
        select(models.file_system.FileSystem).where(
            models.file_system.FileSystem.id == file_system_id,
            models.file_system.FileSystem.delete_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_file_systems_by_ids_async(
    db: AsyncSession,
    file_system_ids: list[int],
):
    if not file_system_ids:
        return []
    result = await db.execute(
        select(models.file_system.FileSystem).where(
            models.file_system.FileSystem.id.in_(file_system_ids),
            models.file_system.FileSystem.delete_at.is_(None),
        )
    )
    return list(result.scalars().all())

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

async def get_user_file_system_by_id_async(
    db: AsyncSession,
    user_file_system_id: int
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
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


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
    result = await db.execute(stmt)
    return list(result.scalars().all())
