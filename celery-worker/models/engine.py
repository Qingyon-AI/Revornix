from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from data.sql.base import Base
from models.user import User


class UserEngine(Base):
    __tablename__ = "user_engine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    engine_id: Mapped[int] = mapped_column(ForeignKey("engine.id"), nullable=False)
    role: Mapped[int] = mapped_column(Integer, comment='0: owner, 1: forker')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Engine(Base):
    """用户已经配置好的引擎，可以公开被大家使用，其实说简单点可以视作公开一份引擎配置
    """
    __tablename__ = "engine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    engine_provided_id: Mapped[int] = mapped_column(ForeignKey("engine_provided.id"), nullable=False)  # 用户必须从EngineProvided中选择
    config_json: Mapped[str | None] = mapped_column(String(2000))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    creator: Mapped[User] = relationship("User", backref="engines")
    engine_provided: Mapped[EngineProvided] = relationship("EngineProvided", backref="engines")


class EngineProvided(Base):
    """可选的引擎，即系统目前支持的引擎，用户要增加引擎只能从这里面选择
    """
    __tablename__ = "engine_provided"
    
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
    category: Mapped[int] = mapped_column(Integer, comment='0: Markdown Convert Engine, 1: TTS Engine, 2: Image Engine')
