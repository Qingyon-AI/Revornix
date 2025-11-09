from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class UserAIModel(Base):
    __tablename__ = "user_ai_model"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    ai_model_id: Mapped[int] = mapped_column(ForeignKey("ai_model.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    api_key: Mapped[str] = mapped_column(String(255), nullable=False)
    api_url: Mapped[str] = mapped_column(String(255), nullable=False)


class AIModel(Base):
    __tablename__ = "ai_model"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    provider_id: Mapped[int] = mapped_column(ForeignKey("ai_model_provider.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class UserAIModelProvider(Base):
    __tablename__ = "user_ai_model_provider"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    ai_model_provider_id: Mapped[int] = mapped_column(ForeignKey("ai_model_provider.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    api_key: Mapped[str] = mapped_column(String(255), nullable=False)
    api_url: Mapped[str] = mapped_column(String(255), nullable=False)


class AIModelPorvider(Base):
    __tablename__ = "ai_model_provider"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))