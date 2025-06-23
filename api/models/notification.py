from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    title = Column(String(200), index=True, nullable=False)
    notification_type = Column(Integer, index=True, comment='0: system notification，1: user comment，2: vote and subscribe，3: follow')
    content = Column(String(2000), nullable=False)
    link = Column(String(500), comment='The link to the related resource')
    read_at = Column(DateTime(timezone=True), nullable=True)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)
    
class NotificationSource(Base):
    __tablename__ = "notification_source"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
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