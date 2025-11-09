from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class NotificationTask(Base):
    __tablename__ = "notification_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), index=True, nullable=False)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), index=True, nullable=False)
    notification_content_type: Mapped[int] = mapped_column(Integer, index=True, comment='0: custom, 1: template', nullable=False)
    # TODO 通知任务除了定时执行以外应该还有事件触发执行，待补充
    cron_expr: Mapped[Optional[str]] = mapped_column(String(100))
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False)
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
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text())
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), index=True, nullable=False)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), index=True, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationTarget(Base):
    __tablename__ = "notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    category: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: email, 1: ios, 2: android, 3: sms')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class IOSNotificationSource(Base):
    __tablename__ = "ios_notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), index=True, nullable=False)
    team_id: Mapped[str] = mapped_column(String(200), nullable=False)
    key_id: Mapped[str] = mapped_column(String(200), nullable=False)
    private_key: Mapped[str] = mapped_column(String(2000), nullable=False)
    app_bundle_id: Mapped[str] = mapped_column(String(200), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class IOSNotificationTarget(Base):
    __tablename__ = "ios_notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), index=True, nullable=False)
    device_token: Mapped[str] = mapped_column(String(200), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class EmailNotificationTarget(Base):
    __tablename__ = "email_notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_target_id: Mapped[int] = mapped_column(ForeignKey("notification_target.id"), index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NotificationSource(Base):
    __tablename__ = "notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    category: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: email, 1: ios, 2: android, 3: sms')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class EmailNotificationSource(Base):
    __tablename__ = "email_notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_source_id: Mapped[int] = mapped_column(ForeignKey("notification_source.id"), index=True, nullable=False)
    server: Mapped[str] = mapped_column(String(100), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    email: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(100), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
