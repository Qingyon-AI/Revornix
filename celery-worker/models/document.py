from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from data.sql.base import Base
from models.user import User


class Label(Base):
    __tablename__ = "document_label"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class UserDocument(Base):
    __tablename__ = "user_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    authority: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: owner')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class Document(Base):
    __tablename__ = "document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    from_plat: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000))
    ai_summary: Mapped[Optional[str]] = mapped_column(String(10000))
    cover: Mapped[Optional[str]] = mapped_column(String(500))
    category: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: file, 1: website, 2: quick-note')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    creator: Mapped["User"] = relationship("User", backref="created_documents")


class QuickNoteDocument(Base):
    __tablename__ = "quick_note_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text(), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class WebsiteDocument(Base):
    __tablename__ = "website_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    keywords: Mapped[Optional[str]] = mapped_column(String(500))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class FileDocument(Base):
    __tablename__ = "file_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))