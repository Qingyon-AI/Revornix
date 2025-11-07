from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class DocumentTransformToMdTask(Base):
    __tablename__ = "document_transform_to_md_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    status: Mapped[Optional[int]] = mapped_column(Integer, comment='0: waiting to transform, 1: transforming, 2: transformed successfully, 3: transform failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)


class DocumentEmbeddingTask(Base):
    __tablename__ = "document_embedding_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    status: Mapped[Optional[int]] = mapped_column(Integer, comment='0: waiting to embed, 1: embedding, 2: embedded successfully, 3: embed failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)


class DocumentGraphTask(Base):
    __tablename__ = "document_graph_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    status: Mapped[Optional[int]] = mapped_column(Integer, comment='0: waiting to generate graph, 1: generating graph, 2: graph generated successfully, 3: graph generation failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)


class DocumentPodcastTask(Base):
    __tablename__ = "document_podcast_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    status: Mapped[Optional[int]] = mapped_column(Integer, comment='0: waiting to generate podcast, 1: generating podcast, 2: podcast generated successfully, 3: podcast generation failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)
    

class DocumentProcessTask(Base):
    # 包含所有的文档处理，同时如果用户设置了AI自动总结，那么需要等总结结束才设置为完成
    __tablename__ = "document_process_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    status: Mapped[Optional[int]] = mapped_column(Integer, comment='0: waiting to process, 1: processing, 2: processed successfully, 3: process failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)


class SectionPodcastTask(Base):
    __tablename__ = "section_podcast_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    status: Mapped[Optional[int]] = mapped_column(Integer, comment='0: waiting to generate podcast, 1: generating podcast, 2: podcast generated successfully, 3: podcast generation failed')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    section_id: Mapped[Optional[int]] = mapped_column(ForeignKey("section.id"), index=True)
