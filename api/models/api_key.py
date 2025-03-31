from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base
    
class ApiKey(Base):
    __tablename__ = 'api_key'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'), index=True, comment='The id of the user who owns the API key')
    api_key = Column(String(100), unique=True, index=True)
    description = Column(String(255), index=True, comment='The description of the API key')
    last_used_time = Column(DateTime(timezone=True), comment='The last time the API key was used')
    create_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))