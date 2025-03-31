from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from common.sql import Base
class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    uuid = Column(String(100), index=True, nullable=False)
    avatar_id = Column(ForeignKey('attachment.id'), nullable=False, index=True)
    nickname = Column(String(50), index=True, nullable=False)
    last_login_ip = Column(String(50))
    last_login_time = Column(DateTime(timezone=True))
    slogan = Column(String(200))
    gender = Column(Integer, comment='0: unk, 1: male, 2: female')
    age = Column(Integer)
    is_forbidden = Column(Boolean, default=False)
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
    avatar = relationship("Attachment", backref="avatar_users")