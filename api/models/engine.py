from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from data.sql.base import Base


class UserEngine(Base):
    __tablename__ = "user_engine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    engine_id: Mapped[int] = mapped_column(ForeignKey("engine.id"), nullable=False)
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    config_json: Mapped[str | None] = mapped_column(String(2000))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Engine(Base):
    __tablename__ = "engine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    description_zh: Mapped[str | None] = mapped_column(String(500))
    demo_config: Mapped[str | None] = mapped_column(String(2000))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    category: Mapped[int] = mapped_column(Integer, comment='0: Markdown Convert Engine, 1: TTS Engine')
