from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from data.sql.base import Base
from models.user import User


class AccessRequest(Base):
    __tablename__ = "access_request"
    __table_args__ = (
        Index(
            "ix_access_request_unique_pending",
            "target_type",
            "target_id",
            "applicant_id",
            unique=True,
            postgresql_where="status = 0",
            sqlite_where="status = 0",
        ),
        Index("ix_access_request_target", "target_type", "target_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_type: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: section, 1: document')
    target_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    applicant_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    message: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[int] = mapped_column(Integer, nullable=False, index=True, comment='0: pending, 1: approved, 2: rejected, 3: cancelled')
    granted_authority: Mapped[int | None] = mapped_column(Integer, comment='Section/document authority assigned when approving')
    handled_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"))
    handle_message: Mapped[str | None] = mapped_column(String(1000))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    applicant: Mapped[User] = relationship("User", foreign_keys=[applicant_id])
    handler: Mapped[User | None] = relationship("User", foreign_keys=[handled_by])
