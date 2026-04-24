from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import models


def create_api_key(
    db: Session,
    user_id: int,
    api_key: str,
    description: str
):
    now = datetime.now(timezone.utc)
    db_api_key = models.api_key.ApiKey(user_id=user_id,
                                       api_key=api_key,
                                       description=description,
                                       create_time=now)
    db.add(db_api_key)
    db.flush()
    return db_api_key

async def create_api_key_async(
    db: AsyncSession,
    user_id: int,
    api_key: str,
    description: str
):
    now = datetime.now(timezone.utc)
    db_api_key = models.api_key.ApiKey(user_id=user_id,
                                       api_key=api_key,
                                       description=description,
                                       create_time=now)
    db.add(db_api_key)
    await db.flush()
    return db_api_key

def get_api_key_by_api_key(
    db: Session,
    api_key: str
):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.api_key == api_key,
                         models.api_key.ApiKey.delete_at.is_(None))
    return query.first()


async def get_api_key_by_api_key_async(
    db: AsyncSession,
    api_key: str,
):
    stmt = select(models.api_key.ApiKey).where(
        models.api_key.ApiKey.api_key == api_key,
        models.api_key.ApiKey.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalars().first()

def count_user_api_key(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.user_id == user_id,
                         models.api_key.ApiKey.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.api_key.ApiKey.description.like(f"%{keyword}%"))
    return query.count()

async def count_user_api_key_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None
):
    stmt = select(func.count(models.api_key.ApiKey.id)).where(
        models.api_key.ApiKey.user_id == user_id,
        models.api_key.ApiKey.delete_at.is_(None),
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.api_key.ApiKey.description.like(f"%{keyword}%"))
    return (await db.execute(stmt)).scalar_one()

def search_api_key(
    db: Session,
    user_id: int,
    page_num: int,
    page_size: int = 10,
    keyword: str | None = None
):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.user_id == user_id,
                         models.api_key.ApiKey.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.api_key.ApiKey.description.like(f"%{keyword}%"))
    query = query.order_by(models.api_key.ApiKey.create_time.desc())
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

async def search_api_key_async(
    db: AsyncSession,
    user_id: int,
    page_num: int,
    page_size: int = 10,
    keyword: str | None = None
):
    stmt = select(models.api_key.ApiKey).where(
        models.api_key.ApiKey.user_id == user_id,
        models.api_key.ApiKey.delete_at.is_(None),
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.api_key.ApiKey.description.like(f"%{keyword}%"))
    stmt = stmt.order_by(models.api_key.ApiKey.create_time.desc())
    stmt = stmt.offset((page_num - 1) * page_size)
    stmt = stmt.limit(page_size)
    return (await db.execute(stmt)).scalars().all()

def delete_api_keys_by_api_key_ids(db: Session,
                                   user_id: int,
                                   api_key_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.user_id == user_id,
                         models.api_key.ApiKey.delete_at.is_(None),
                         models.api_key.ApiKey.id.in_(api_key_ids))
    query.update({models.api_key.ApiKey.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_api_keys_by_api_key_ids_async(
    db: AsyncSession,
    user_id: int,
    api_key_ids: list[int]
):
    now = datetime.now(timezone.utc)
    await db.execute(
        update(models.api_key.ApiKey)
        .where(
            models.api_key.ApiKey.user_id == user_id,
            models.api_key.ApiKey.delete_at.is_(None),
            models.api_key.ApiKey.id.in_(api_key_ids),
        )
        .values(delete_at=now)
    )
    await db.flush()
