import models
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from enums.user import UserRole

def get_user_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.uuid == uuid, 
                         models.user.User.delete_at.is_(None))
    return query.one_or_none()

def get_user_by_id(
    db: Session,
    user_id: int
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at.is_(None))
    return query.one_or_none()


async def get_user_by_id_async(
    db: AsyncSession,
    user_id: int,
):
    stmt = select(models.user.User).where(
        models.user.User.id == user_id,
        models.user.User.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_user_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    stmt = select(models.user.User).where(
        models.user.User.uuid == uuid,
        models.user.User.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


def get_root_user(
    db: Session
):
    query = db.query(models.user.User)
    query = query.filter(
        models.user.User.role == UserRole.ROOT,
        models.user.User.delete_at.is_(None)
    )
    return query.one_or_none()


async def get_users_by_ids_async(
    db: AsyncSession,
    user_ids: list[int],
):
    if not user_ids:
        return []
    stmt = select(models.user.User).where(
        models.user.User.id.in_(user_ids),
        models.user.User.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())
