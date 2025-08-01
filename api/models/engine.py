from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from common.sql import Base

class UserEngine(Base):
    __tablename__ = "user_engine"

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False, index=True)
    description = Column(String(2000))
    user_id = Column(Integer, ForeignKey("user.id"))
    engine_id = Column(Integer, ForeignKey("engine.id"))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    enable = Column(Boolean)
    config_json = Column(String(2000))

class Engine(Base):
    __tablename__ = "engine"

    id = Column(Integer, primary_key=True)
    uuid = Column(String(100), nullable=False, index=True, unique=True)
    name = Column(String(100), nullable=False, index=True)
    name_zh = Column(String(100), nullable=False, index=True)
    description = Column(String(500))
    description_zh = Column(String(500))
    demo_config = Column(String(2000))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))