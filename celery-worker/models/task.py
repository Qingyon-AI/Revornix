from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from common.sql import Base

class DocumentTransformToMdTask(Base):
    __tablename__ = "document_transform_to_md_task"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    status = Column(Integer, comment='0: waiting to transform, 1: transforming, 2: transformed successfully, 3: transform failed')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    
class RegularTask(Base):
    __tablename__ = "regular_task"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    task_type = Column(Integer, nullable=False, comment='0: interval, 1: cron')
    interval_seconds = Column(Integer, nullable=True, comment='only for interval tasks')
    cron_expr = Column(String(100), nullable=True, comment='only for cron tasks')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    func_id = Column(Integer, nullable=False, comment='the id of the function')