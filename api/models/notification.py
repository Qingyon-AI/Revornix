from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base

class NotificationTask(Base):
    __tablename__ = "notification_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    user_notification_source_id: Mapped[int] = mapped_column(ForeignKey("user_notification_source.id"), index=True, nullable=False)
    user_notification_target_id: Mapped[int] = mapped_column(ForeignKey("user_notification_target.id"), index=True, nullable=False)
    notification_content_type: Mapped[int] = mapped_column(Integer, index=True, comment='0: custom, 1: template', nullable=False)
    trigger_type: Mapped[int] = mapped_column(Integer, index=True, comment='0: event, 1: scheduler', nullable=False)
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

class NotificationTaskTriggerScheduler(Base):
    __tablename__ = "notification_task_trigger_scheduler"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    cron_expr: Mapped[str] = mapped_column(String(100), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationTaskTriggerEvent(Base):
    __tablename__ = "notification_task_trigger_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    trigger_event_id: Mapped[int] = mapped_column(ForeignKey("trigger_event.id"), index=True, nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class TriggerEvent(Base):
    __tablename__ = "trigger_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    description_zh: Mapped[Optional[str]] = mapped_column(String(500))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationTaskContentTemplate(Base):
    __tablename__ = "notification_task_content_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    notification_template_id: Mapped[int] = mapped_column(Integer, nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationTaskContentCustom(Base):
    __tablename__ = "notification_task_content_custom"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[int] = mapped_column(ForeignKey("notification_task.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text())
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationRecord(Base):
    __tablename__ = "notification_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    cover: Mapped[Optional[str]] = mapped_column(String(2000))
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text())
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationSource(Base):
    __tablename__ = "notification_source"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    description_zh: Mapped[Optional[str]] = mapped_column(String(500))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    demo_config: Mapped[Optional[str]] = mapped_column(String(2000))


class UserNotificationSource(Base):
    __tablename__ = "user_notification_source"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    config_json: Mapped[Optional[str]] = mapped_column(String(2000))


class NotificationTarget(Base):
    __tablename__ = "notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    description_zh: Mapped[Optional[str]] = mapped_column(String(500))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    demo_config: Mapped[Optional[str]] = mapped_column(String(2000))


class UserNotificationTarget(Base):
    __tablename__ = "user_notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    config_json: Mapped[Optional[str]] = mapped_column(String(2000))