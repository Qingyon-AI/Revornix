from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.sql import Base
from models.user import User


class Document(Base):
    __tablename__ = "document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), index=True)
    from_plat: Mapped[Optional[str]] = mapped_column(String(100))
    title: Mapped[Optional[str]] = mapped_column(String(500), index=True)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    ai_summary: Mapped[Optional[str]] = mapped_column(String(10000))
    cover: Mapped[Optional[str]] = mapped_column(String(500))
    category: Mapped[Optional[int]] = mapped_column(Integer, index=True, comment='0: file, 1: website, 2: quick-note')
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    creator: Mapped[Optional["User"]] = relationship("User", backref="created_documents")


class QuickNoteDocument(Base):
    __tablename__ = "quick_note_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)
    content: Mapped[str] = mapped_column(String(1000), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class WebsiteDocument(Base):
    __tablename__ = "website_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    keywords: Mapped[Optional[str]] = mapped_column(String(500))
    md_file_name: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class FileDocument(Base):
    __tablename__ = "file_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    md_file_name: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
