from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from data.sql.base import Base
from models.user import User


class NotificationSourceProvided(Base):
    __tablename__ = "notification_source_provided"

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


class NotificationSource(Base):
    __tablename__ = "notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    notification_source_provided_id: Mapped[int] = mapped_column(ForeignKey("notification_source_provided.id"), index=True, nullable=False)
    config_json: Mapped[str | None] = mapped_column(String(2000))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User] = relationship("User", backref="notification_sources")
    notification_source_provided: Mapped[NotificationSourceProvided] = relationship("NotificationSourceProvided", backref="notification_sources")


class UserNotificationSource(Base):
    __tablename__ = "user_notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), nullable=False)
    role: Mapped[int] = mapped_column(Integer, comment='0: owner, 1: forker')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTargetProvided(Base):
    __tablename__ = "notification_target_provided"

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


class NotificationTarget(Base):
    __tablename__ = "notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    notification_target_provided_id: Mapped[int] = mapped_column(ForeignKey("notification_target_provided.id"), index=True, nullable=False)
    config_json: Mapped[str | None] = mapped_column(String(2000))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User] = relationship("User", backref="notification_targets")
    notification_target_provided: Mapped[NotificationTargetProvided] = relationship("NotificationTargetProvided", backref="notification_targets")


class UserNotificationTarget(Base):
    __tablename__ = "user_notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), nullable=False)
    role: Mapped[int] = mapped_column(Integer, comment='0: owner, 1: forker')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTemplate(Base):
    __tablename__ = "notification_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    description_zh: Mapped[str | None] = mapped_column(String(500))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTask(Base):
    __tablename__ = "notification_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), index=True, nullable=False)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), index=True, nullable=False)
    content_type: Mapped[int] = mapped_column(Integer, index=True, comment='0: custom, 1: template', nullable=False)
    trigger_type: Mapped[int] = mapped_column(Integer, index=True, comment='0: event, 1: scheduler', nullable=False)
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTaskTriggerScheduler(Base):
    __tablename__ = "notification_task_trigger_scheduler"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    cron_expr: Mapped[str] = mapped_column(String(100), nullable=False)
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTaskTriggerEvent(Base):
    __tablename__ = "notification_task_trigger_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    trigger_event_id: Mapped[int] = mapped_column(ForeignKey("trigger_event.id"), index=True, nullable=False)
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TriggerEvent(Base):
    __tablename__ = "trigger_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    description_zh: Mapped[str | None] = mapped_column(String(500))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTaskContentTemplate(Base):
    __tablename__ = "notification_task_content_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    notification_template_id: Mapped[int] = mapped_column(Integer, nullable=False)
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationTaskContentCustom(Base):
    __tablename__ = "notification_task_content_custom"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[str | None] = mapped_column(Text())
    cover: Mapped[str | None] = mapped_column(String(2000))
    link: Mapped[str | None] = mapped_column(String(2000))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationRecord(Base):
    __tablename__ = "notification_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    cover: Mapped[str | None] = mapped_column(String(2000))
    link: Mapped[str | None] = mapped_column(String(2000))
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[str | None] = mapped_column(Text())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))