from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class UserEngine(Base):
    __tablename__ = "user_engine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"))
    engine_id: Mapped[Optional[int]] = mapped_column(ForeignKey("engine.id"))
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    enable: Mapped[Optional[bool]] = mapped_column(Boolean)
    config_json: Mapped[Optional[str]] = mapped_column(String(2000))


class Engine(Base):
    __tablename__ = "engine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), nullable=False, index=True, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name_zh: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    description_zh: Mapped[Optional[str]] = mapped_column(String(500))
    demo_config: Mapped[Optional[str]] = mapped_column(String(2000))
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    category: Mapped[Optional[str]] = mapped_column(Integer, comment='0: markdown转化引擎, 1: tts引擎')
