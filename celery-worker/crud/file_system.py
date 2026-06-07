import models
from datetime import datetime, timezone
from sqlalchemy import or_, select
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
