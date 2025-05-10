from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class UserAIModel(Base):
    __tablename__ = "user_ai_model"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    ai_model_id = Column(Integer, ForeignKey("ai_model.id"), index=True)
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    api_key = Column(String(255), nullable=False)
    api_url = Column(String(255), nullable=False)

class AIModel(Base):
    __tablename__ = "ai_model"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255))
    provider_id = Column(Integer, ForeignKey("ai_model_provider.id"), index=True)
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    
class UserAIModelProvider(Base):
    __tablename__ = "user_ai_model_provider"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    ai_model_provider_id = Column(Integer, ForeignKey("ai_model_provider.id"), index=True)
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    api_key = Column(String(255), nullable=False)
    api_url = Column(String(255), nullable=False)

class AIModelPorvider(Base):
    __tablename__ = "ai_model_provider"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    