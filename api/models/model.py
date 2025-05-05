from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class AIModelPorvider(Base):
    __tablename__ = "ai_model_provider"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), index=True, nullable=False, comment='The name of the AI model provider')
    description = Column(String(255))
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))
    api_key = Column(String(255), nullable=False, comment='The API key for the AI model provider')
    api_url = Column(String(255), nullable=False, comment='The API URL for the AI model provider')
    
class AIModel(Base):
    __tablename__ = "ai_model"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    name = Column(String(255), index=True, nullable=False, comment='The name of the AI model')
    description = Column(String(255))
    provider_id = Column(Integer, ForeignKey("ai_model_provider.id"), index=True)
    api_key = Column(String(255), nullable=False, comment='The API key for the AI model')
    api_url = Column(String(255), nullable=False, comment='The API URL for the AI model')
    create_time = Column(DateTime(timezone=True))
    update_time = Column(DateTime(timezone=True))
    delete_at = Column(DateTime(timezone=True))