from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class FileSystem(Base):
    __tablename__ = "file_system"
    
    id = Column(Integer, primary_key=True)
    uuid = Column(String(100), nullable=False, index=True, unique=True)
    name = Column(String(200), index=True)
    name_zh = Column(String(200), index=True)
    description = Column(String(500))
    description_zh = Column(String(500))
    demo_config = Column(String(2000))
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    
class UserFileSystem(Base):
    __tablename__ = "user_file_system"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    file_system_id = Column(Integer, ForeignKey("file_system.id"), nullable=False)
    config_json = Column(String(5000))
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))