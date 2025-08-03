from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from common.sql import Base

class NotificationTask(Base):
    __tablename__ = "notification_task"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    notification_source_id = Column(Integer, ForeignKey("notification_source.id"), index=True)
    notification_target_id = Column(Integer, ForeignKey("notification_target.id"), index=True)
    notification_content_type = Column(Integer, index=True, comment='0: custom, 1: template')
    cron_expr = Column(String(100), nullable=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)
    enable = Column(Boolean, default=True, nullable=False)
    
class NotificationTaskContentTemplate(Base):
    __tablename__ = "notification_task_content_template"

    id = Column(Integer, primary_key=True)
    notification_task_id = Column(Integer, ForeignKey("notification_task.id"), index=True)
    notification_template_id = Column(Integer, index=True)
    delete_at = Column(DateTime(timezone=True), index=True)
    
class NotificationTaskContentCustom(Base):
    __tablename__ = "notification_task_content_custom"

    id = Column(Integer, primary_key=True)
    notification_task_id = Column(Integer, ForeignKey("notification_task.id"), index=True)
    title = Column(String(500), index=True, nullable=False)
    content = Column(Text())
    delete_at = Column(DateTime(timezone=True), index=True)

class NotificationRecord(Base):
    __tablename__ = "notification_record"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    title = Column(String(500), index=True, nullable=False)
    content = Column(Text(), nullable=False)
    notification_source_id = Column(Integer, ForeignKey("notification_source.id"), index=True)
    notification_target_id = Column(Integer, ForeignKey("notification_target.id"), index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)

class NotificationTarget(Base):
    __tablename__ = "notification_target"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), index=True, nullable=False)
    description = Column(String(500), nullable=False)
    creator_id = Column(Integer, ForeignKey("user.id"), index=True)
    category = Column(Integer, index=True, comment='0: email, 1: ios, 2: android, 3: sms')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)

class EmailNotificationTarget(Base):
    __tablename__ = "email_notification_target"

    id = Column(Integer, primary_key=True)
    notification_target_id = Column(Integer, ForeignKey("notification_target.id"), index=True)
    email = Column(String(100), nullable=False)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)

class NotificationSource(Base):
    __tablename__ = "notification_source"

    id = Column(Integer, primary_key=True)
    creator_id = Column(Integer, ForeignKey("user.id"), index=True)
    title = Column(String(200), index=True, nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(Integer, index=True, comment='0: email, 1: ios, 2: android, 3: sms')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)

class EmailNotificationSource(Base):
    __tablename__ = "email_notification_source"

    id = Column(Integer, primary_key=True)
    notification_source_id = Column(Integer, ForeignKey("notification_source.id"), index=True)
    server = Column(String(100), nullable=False)
    port = Column(Integer, nullable=False)
    email = Column(String(100), index=True, nullable=False)
    password = Column(String(100), nullable=False)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)