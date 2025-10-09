from sqlalchemy import Column, Integer, ForeignKey, DateTime
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
    
class DocumentEmbeddingTask(Base):
    __tablename__ = "document_embedding_task"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    status = Column(Integer, comment='0: waiting to embed, 1: embedding, 2: embedded successfully, 3: embed failed')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    
class DocumentGraphTask(Base):
    __tablename__ = "document_graph_task"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    status = Column(Integer, comment='0: waiting to generate graph, 1: generating graph, 2: graph generated successfully, 3: graph generation failed')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    document_id = Column(Integer, ForeignKey("document.id"), index=True)
    
class DocumentProcessTask(Base):
    # 包含所有的文档处理，同时如果用户设置了AI自动总结，那么需要等总结结束才设置为完成
    __tablename__ = "document_process_task"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    status = Column(Integer, comment='0: waiting to process, 1: processing, 2: processed successfully, 3: process failed')
    create_time = Column(DateTime(timezone=True), nullable=False)
    update_time = Column(DateTime(timezone=True), nullable=False)
    delete_at = Column(DateTime(timezone=True))
    document_id = Column(Integer, ForeignKey("document.id"), index=True)