from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from data.sql.base import Base


class UsageLedger(Base):
    __tablename__ = "usage_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    resource_uuid: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    cycle_month: Mapped[str] = mapped_column(String(7), index=True, nullable=False, comment="UTC cycle month, format: YYYY-MM")
    usage_json: Mapped[str] = mapped_column(String(4000), nullable=False, default="{}")
    billable_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source: Mapped[str | None] = mapped_column(String(100))
    idempotency_key: Mapped[str | None] = mapped_column(String(255), unique=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class MonthlyUsageSummary(Base):
    __tablename__ = "monthly_usage_summary"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "resource_uuid",
            "cycle_month",
            name="uq_monthly_usage_summary_user_resource_cycle",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    resource_uuid: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    cycle_month: Mapped[str] = mapped_column(String(7), index=True, nullable=False, comment="UTC cycle month, format: YYYY-MM")
    usage_json: Mapped[str] = mapped_column(String(4000), nullable=False, default="{}")
    used_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
