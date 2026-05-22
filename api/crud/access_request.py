from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import models
from enums.access_request import AccessRequestStatus, AccessRequestTargetType


async def create_access_request_async(
    db: AsyncSession,
    target_type: int,
    target_id: int,
    applicant_id: int,
    message: str | None,
) -> models.access_request.AccessRequest:
    now = datetime.now(timezone.utc)
    db_request = models.access_request.AccessRequest(
        target_type=target_type,
        target_id=target_id,
        applicant_id=applicant_id,
        message=message,
        status=AccessRequestStatus.PENDING.value,
        create_time=now,
    )
    db.add(db_request)
    await db.flush()
    return db_request


async def get_access_request_by_id_async(
    db: AsyncSession,
    access_request_id: int,
) -> models.access_request.AccessRequest | None:
    stmt = select(models.access_request.AccessRequest).where(
        models.access_request.AccessRequest.id == access_request_id,
        models.access_request.AccessRequest.delete_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_pending_access_request_async(
    db: AsyncSession,
    target_type: int,
    target_id: int,
    applicant_id: int,
) -> models.access_request.AccessRequest | None:
    stmt = select(models.access_request.AccessRequest).where(
        models.access_request.AccessRequest.target_type == target_type,
        models.access_request.AccessRequest.target_id == target_id,
        models.access_request.AccessRequest.applicant_id == applicant_id,
        models.access_request.AccessRequest.status == AccessRequestStatus.PENDING.value,
        models.access_request.AccessRequest.delete_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_access_requests_by_target_async(
    db: AsyncSession,
    target_type: int,
    target_id: int,
    status: int | None = None,
) -> list[models.access_request.AccessRequest]:
    stmt = select(models.access_request.AccessRequest).where(
        models.access_request.AccessRequest.target_type == target_type,
        models.access_request.AccessRequest.target_id == target_id,
        models.access_request.AccessRequest.delete_at.is_(None),
    )
    if status is not None:
        stmt = stmt.where(models.access_request.AccessRequest.status == status)
    stmt = stmt.order_by(models.access_request.AccessRequest.create_time.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_access_requests_by_applicant_async(
    db: AsyncSession,
    applicant_id: int,
    target_type: int | None = None,
    status: int | None = None,
) -> list[models.access_request.AccessRequest]:
    stmt = select(models.access_request.AccessRequest).where(
        models.access_request.AccessRequest.applicant_id == applicant_id,
        models.access_request.AccessRequest.delete_at.is_(None),
    )
    if target_type is not None:
        stmt = stmt.where(models.access_request.AccessRequest.target_type == target_type)
    if status is not None:
        stmt = stmt.where(models.access_request.AccessRequest.status == status)
    stmt = stmt.order_by(models.access_request.AccessRequest.create_time.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_pending_access_requests_async(
    db: AsyncSession,
    target_type: int,
    target_id: int,
) -> int:
    from sqlalchemy import func
    stmt = select(func.count(models.access_request.AccessRequest.id)).where(
        models.access_request.AccessRequest.target_type == target_type,
        models.access_request.AccessRequest.target_id == target_id,
        models.access_request.AccessRequest.status == AccessRequestStatus.PENDING.value,
        models.access_request.AccessRequest.delete_at.is_(None),
    )
    result = await db.execute(stmt)
    return int(result.scalar_one())
