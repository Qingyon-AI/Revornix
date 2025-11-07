from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.sql import Base
from models.user import User


class SectionUser(Base):
    __tablename__ = "section_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)
    authority: Mapped[int] = mapped_column(Integer, nullable=False, index=True, comment='0: full access 1: w/r 2: r')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # expire_time is null means the time is infinite
    expire_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class SectionDocument(Base):
    __tablename__ = "section_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[int] = mapped_column(Integer, nullable=False, index=True, comment='0: waiting to be supplemented, 1: supplementing 2: supplemented successfully 3: supplemented error')
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class Section(Base):
    __tablename__ = "section"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    cover: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the cover image which you uploaded to the file system')
    description: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    md_file_name: Mapped[Optional[str]] = mapped_column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    creator: Mapped["User"] = relationship("User", backref="created_sections")


class SectionPodcast(Base):
    __tablename__ = "section_podcast"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[Optional[int]] = mapped_column(ForeignKey("section.id"), index=True)
    podcast_file_name: Mapped[str] = mapped_column(String(500), nullable=False, index=True, comment='The path of the podcast file which you uploaded to the file system')
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    