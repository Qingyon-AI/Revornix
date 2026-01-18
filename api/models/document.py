from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from data.sql.base import Base
from models.user import User


class UserDocument(Base):
    __tablename__ = "user_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    authority: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: owner')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StarDocument(Base):
    __tablename__ = "star_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Label(Base):
    __tablename__ = "document_label"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DocumentLabel(Base):
    __tablename__ = "document_document_label"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    label_id: Mapped[int] = mapped_column(ForeignKey("document_label.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReadDocument(Base):
    __tablename__ = "read_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    read_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, comment='The time when the user read the document')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Document(Base):
    __tablename__ = "document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    from_plat: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    cover: Mapped[str | None] = mapped_column(String(500))
    category: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: file, 1: website, 2: quick-note')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User] = relationship("User", backref="created_documents")


class QuickNoteDocument(Base):
    __tablename__ = "quick_note_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text(), nullable=False)
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WebsiteDocument(Base):
    __tablename__ = "website_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    keywords: Mapped[str | None] = mapped_column(String(500))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class FileDocument(Base):
    __tablename__ = "file_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DocumentNote(Base):
    __tablename__ = "document_note"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(String(5000), nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship("User", backref="document_notes")
    document: Mapped[Document] = relationship("Document", backref="notes")
