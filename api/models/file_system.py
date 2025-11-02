from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class FileSystem(Base):
    __tablename__ = "file_system"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), nullable=False, index=True, unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    name_zh: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    description_zh: Mapped[Optional[str]] = mapped_column(String(500))
    demo_config: Mapped[Optional[str]] = mapped_column(String(2000))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class UserFileSystem(Base):
    __tablename__ = "user_file_system"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    file_system_id: Mapped[int] = mapped_column(ForeignKey("file_system.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(2000))
    config_json: Mapped[Optional[str]] = mapped_column(String(5000))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
