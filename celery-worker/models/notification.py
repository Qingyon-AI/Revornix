from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    notification_type: Mapped[Optional[int]] = mapped_column(Integer, index=True, comment='0: system notification，1: user comment，2: vote and subscribe，3: follow')
    content: Mapped[str] = mapped_column(String(2000), nullable=False)
    link: Mapped[Optional[str]] = mapped_column(String(500), comment='The link to the related resource')
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
