from sqlalchemy import Column, Integer, String, DateTime
from common.sql import Base
    
class Attachment(Base):
    __tablename__ = 'attachment'

    id = Column(Integer, primary_key=True)
    name = Column(String(500), nullable=False, index=True, comment='The path of your file saved on the file system')
    description = Column(String(255), comment='The description of your file')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    