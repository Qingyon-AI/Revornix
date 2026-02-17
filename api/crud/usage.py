from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

import models


def get_usage_ledger_by_idempotency_key(
    db: Session,
    *,
    idempotency_key: str,
):
    query = db.query(models.usage.UsageLedger)
    query = query.filter(
        models.usage.UsageLedger.idempotency_key == idempotency_key,
    )
    return query.one_or_none()


def create_usage_ledger(
    db: Session,
    *,
    user_id: int,
    resource_uuid: str,
    resource_type: str,
    cycle_month: str,
    usage_json: str,
    billable_points: int,
    source: str | None = None,
    idempotency_key: str | None = None,
    create_time: datetime | None = None,
):
    now = create_time or datetime.now(timezone.utc)
    row = models.usage.UsageLedger(
        user_id=user_id,
        resource_uuid=resource_uuid,
        resource_type=resource_type,
        cycle_month=cycle_month,
        usage_json=usage_json,
        billable_points=billable_points,
        source=source,
        idempotency_key=idempotency_key,
        create_time=now,
    )
    db.add(row)
    db.flush()
    return row


def get_monthly_usage_summary(
    db: Session,
    *,
    user_id: int,
    resource_uuid: str,
    cycle_month: str,
):
    query = db.query(models.usage.MonthlyUsageSummary)
    query = query.filter(
        models.usage.MonthlyUsageSummary.user_id == user_id,
        models.usage.MonthlyUsageSummary.resource_uuid == resource_uuid,
        models.usage.MonthlyUsageSummary.cycle_month == cycle_month,
    )
    return query.one_or_none()


def create_monthly_usage_summary(
    db: Session,
    *,
    user_id: int,
    resource_uuid: str,
    resource_type: str,
    cycle_month: str,
    usage_json: str,
    used_points: int,
    create_time: datetime | None = None,
):
    now = create_time or datetime.now(timezone.utc)
    row = models.usage.MonthlyUsageSummary(
        user_id=user_id,
        resource_uuid=resource_uuid,
        resource_type=resource_type,
        cycle_month=cycle_month,
        usage_json=usage_json,
        used_points=used_points,
        create_time=now,
        update_time=now,
    )
    db.add(row)
    db.flush()
    return row


def sum_usage_ledger_points_in_window(
    db: Session,
    *,
    user_id: int,
    resource_uuid: str,
    start_time: datetime,
    end_time: datetime,
) -> int:
    total = db.query(
        func.coalesce(func.sum(models.usage.UsageLedger.billable_points), 0)
    ).filter(
        models.usage.UsageLedger.user_id == user_id,
        models.usage.UsageLedger.resource_uuid == resource_uuid,
        models.usage.UsageLedger.create_time >= start_time,
        models.usage.UsageLedger.create_time < end_time,
    ).scalar()
    return int(total or 0)
