from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class NotificationTask(Base):
    __tablename__ = "notification_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    notification_source_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_source.id"), index=True)
    notification_target_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_target.id"), index=True)
    notification_content_type: Mapped[Optional[int]] = mapped_column(Integer, index=True, comment='0: custom, 1: template')
    cron_expr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    enable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class NotificationTaskContentTemplate(Base):
    __tablename__ = "notification_task_content_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_task.id"), index=True)
    notification_template_id: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class NotificationTaskContentCustom(Base):
    __tablename__ = "notification_task_content_custom"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_task.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text())
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class NotificationRecord(Base):
    __tablename__ = "notification_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text(), nullable=False)
    notification_source_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_source.id"), index=True)
    notification_target_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_target.id"), index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class NotificationTarget(Base):
    __tablename__ = "notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    creator_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    category: Mapped[Optional[int]] = mapped_column(Integer, index=True, comment='0: email, 1: ios, 2: android, 3: sms')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class IOSNotificationSource(Base):
    __tablename__ = "ios_notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_source_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_source.id"), index=True)
    team_id: Mapped[str] = mapped_column(String(200), nullable=False)
    key_id: Mapped[str] = mapped_column(String(200), nullable=False)
    private_key: Mapped[str] = mapped_column(String(2000), nullable=False)
    app_bundle_id: Mapped[str] = mapped_column(String(200), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class IOSNotificationTarget(Base):
    __tablename__ = "ios_notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_target_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_target.id"), index=True)
    device_token: Mapped[str] = mapped_column(String(200), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class EmailNotificationTarget(Base):
    __tablename__ = "email_notification_target"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_target_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_target.id"), index=True)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class NotificationSource(Base):
    __tablename__ = "notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[Optional[int]] = mapped_column(Integer, index=True, comment='0: email, 1: ios, 2: android, 3: sms')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)


class EmailNotificationSource(Base):
    __tablename__ = "email_notification_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notification_source_id: Mapped[Optional[int]] = mapped_column(ForeignKey("notification_source.id"), index=True)
    server: Mapped[str] = mapped_column(String(100), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    email: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(100), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
