from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from data.sql.base import Base


class DocumentConvertToMdTask(Base):
    __tablename__ = "document_convert_to_md_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to transform, 1: transforming, 2: transformed successfully, 3: transform failed')
    md_file_name: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the converted markdown file which you uploaded to the file system')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)


class DocumentSummarizeTask(Base):
    __tablename__ = "document_summarize_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to summarized, 1: summarizing, 2: summarized successfully, 3: summarized failed')
    summary: Mapped[Optional[str]] = mapped_column(String(5000), comment='The summary of the document')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class DocumentEmbeddingTask(Base):
    __tablename__ = "document_embedding_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to embed, 1: embedding, 2: embedded successfully, 3: embed failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class DocumentGraphTask(Base):
    __tablename__ = "document_graph_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to generate graph, 1: generating graph, 2: graph generated successfully, 3: graph generation failed', )
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    

class DocumentPodcastTask(Base):
    __tablename__ = "document_podcast_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to generate podcast, 1: generating podcast, 2: podcast generated successfully, 3: podcast generation failed')
    podcast_file_name: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the podcast file which you uploaded to the file system')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class DocumentProcessTask(Base):
    # 包含所有的文档处理，同时如果用户设置了AI自动总结，那么需要等总结结束才设置为完成
    __tablename__ = "document_process_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to process, 1: processing, 2: processed successfully, 3: process failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class SectionProcessTask(Base):
    __tablename__ = "section_process_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to process, 1: processing, 2: processed successfully, 3: process failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    trigger_type: Mapped[Optional[int]] = mapped_column(Integer, nullable=False, comment='0: scheduler, 1: updated')


class SectionTriggerScheduler(Base):
    __tablename__ = "section_trigger_scheduler"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_process_task_id: Mapped[int] = mapped_column(ForeignKey("section_process_task.id"), index=True, nullable=False)
    cron_expr: Mapped[str] = mapped_column(String(100), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    

class SectionPodcastTask(Base):
    __tablename__ = "section_podcast_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True, nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, comment='0: waiting to generate podcast, 1: generating podcast, 2: podcast generated successfully, 3: podcast generation failed')
    podcast_file_name: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the podcast file which you uploaded to the file system')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))