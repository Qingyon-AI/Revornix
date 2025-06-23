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
    
class EmailSource(Base):
    __tablename__ = "email_source"

    id = Column(Integer, primary_key=True)
    description = Column(String(500))
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    email = Column(String(100), index=True, nullable=False)
    password = Column(String(100), nullable=False)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True), index=True)