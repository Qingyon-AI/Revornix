from datetime import datetime, timezone

from sqlalchemy import func, or_, select, update
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


async def get_stored_file_by_owner_path_async(
    db: AsyncSession,
    owner_user_id: int,
    path: str,
):
    result = await db.execute(
        select(models.file_system.StoredFile)
        .where(
            models.file_system.StoredFile.owner_user_id == owner_user_id,
            models.file_system.StoredFile.path == path,
            models.file_system.StoredFile.delete_at.is_(None),
        )
        .order_by(models.file_system.StoredFile.update_time.desc().nullslast())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_stored_files_by_owner_paths_async(
    db: AsyncSession,
    items: list[tuple[int, str]],
):
    if not items:
        return {}
    conditions = [
        (
            models.file_system.StoredFile.owner_user_id == owner_user_id
        )
        & (models.file_system.StoredFile.path == path)
        for owner_user_id, path in dict.fromkeys(items)
    ]
    result = await db.execute(
        select(models.file_system.StoredFile).where(
            models.file_system.StoredFile.delete_at.is_(None),
            or_(*conditions),
        )
    )
    files_by_key = {}
    for stored_file in result.scalars().all():
        key = (stored_file.owner_user_id, stored_file.path)
        current = files_by_key.get(key)
        if current is None:
            files_by_key[key] = stored_file
            continue
        current_time = current.update_time or current.create_time
        stored_time = stored_file.update_time or stored_file.create_time
        if stored_time > current_time:
            files_by_key[key] = stored_file
    return files_by_key


async def upsert_stored_file_async(
    db: AsyncSession,
    *,
    owner_user_id: int,
    user_file_system_id: int,
    file_system_id: int,
    path: str,
    content_type: str | None = None,
    size_bytes: int | None = None,
    source: str | None = None,
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(models.file_system.StoredFile).where(
            models.file_system.StoredFile.owner_user_id == owner_user_id,
            models.file_system.StoredFile.user_file_system_id == user_file_system_id,
            models.file_system.StoredFile.path == path,
        )
    )
    stored_file = result.scalar_one_or_none()
    if stored_file is None:
        stored_file = models.file_system.StoredFile(
            owner_user_id=owner_user_id,
            user_file_system_id=user_file_system_id,
            file_system_id=file_system_id,
            path=path,
            content_type=content_type,
            size_bytes=size_bytes,
            source=source,
            create_time=now,
        )
        db.add(stored_file)
    else:
        stored_file.file_system_id = file_system_id
        stored_file.content_type = content_type or stored_file.content_type
        stored_file.size_bytes = size_bytes if size_bytes is not None else stored_file.size_bytes
        stored_file.source = source or stored_file.source
        stored_file.delete_at = None
        stored_file.update_time = now
    await db.flush()
    return stored_file


async def soft_delete_stored_files_by_owner_paths_async(
    db: AsyncSession,
    *,
    owner_user_id: int,
    paths: list[str],
) -> None:
    if not paths:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        update(models.file_system.StoredFile)
        .where(
            models.file_system.StoredFile.owner_user_id == owner_user_id,
            models.file_system.StoredFile.path.in_(paths),
            models.file_system.StoredFile.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()


async def search_stored_files_async(
    db: AsyncSession,
    *,
    owner_user_id: int,
    keyword: str | None = None,
    user_file_system_id: int | None = None,
    start: int | None = None,
    limit: int = 50,
):
    stmt = (
        select(models.file_system.StoredFile)
        .where(
            models.file_system.StoredFile.owner_user_id == owner_user_id,
            models.file_system.StoredFile.delete_at.is_(None),
        )
        .order_by(models.file_system.StoredFile.id.desc())
        .limit(limit + 1)
    )
    if user_file_system_id is not None:
        stmt = stmt.where(models.file_system.StoredFile.user_file_system_id == user_file_system_id)
    if keyword:
        stmt = stmt.where(models.file_system.StoredFile.path.like(f"%{keyword}%"))
    if start is not None:
        stmt = stmt.where(models.file_system.StoredFile.id < start)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_stored_files_async(
    db: AsyncSession,
    *,
    owner_user_id: int,
    keyword: str | None = None,
    user_file_system_id: int | None = None,
) -> int:
    stmt = select(func.count(models.file_system.StoredFile.id)).where(
        models.file_system.StoredFile.owner_user_id == owner_user_id,
        models.file_system.StoredFile.delete_at.is_(None),
    )
    if user_file_system_id is not None:
        stmt = stmt.where(models.file_system.StoredFile.user_file_system_id == user_file_system_id)
    if keyword:
        stmt = stmt.where(models.file_system.StoredFile.path.like(f"%{keyword}%"))
    return int((await db.execute(stmt)).scalar_one())


async def get_stored_files_by_ids_async(
    db: AsyncSession,
    *,
    owner_user_id: int,
    stored_file_ids: list[int],
):
    if not stored_file_ids:
        return []
    result = await db.execute(
        select(models.file_system.StoredFile)
        .where(
            models.file_system.StoredFile.owner_user_id == owner_user_id,
            models.file_system.StoredFile.id.in_(stored_file_ids),
            models.file_system.StoredFile.delete_at.is_(None),
        )
        .order_by(models.file_system.StoredFile.id)
    )
    return list(result.scalars().all())


async def update_stored_file_location_async(
    db: AsyncSession,
    *,
    stored_file: models.file_system.StoredFile,
    user_file_system_id: int,
    file_system_id: int,
    path: str | None = None,
):
    stored_file.user_file_system_id = user_file_system_id
    stored_file.file_system_id = file_system_id
    if path is not None:
        stored_file.path = path
    stored_file.update_time = datetime.now(timezone.utc)
    await db.flush()
    return stored_file
