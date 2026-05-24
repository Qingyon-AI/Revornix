from __future__ import annotations

from datetime import datetime, date as date_type

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Boolean, Date, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from data.sql.base import Base
from models.user import User

class DaySection(Base):
    __tablename__ = "day_section"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True, nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SectionUser(Base):
    __tablename__ = "section_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    role: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: creator 1: member 2: subscriber')
    # managed_by records the FULL_ACCESS member who invited/approved this user.
    # Creator-managed or self-subscribed rows keep it null.
    managed_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), index=True)
    # full access can invite/approve and manage users it brought in; creator retains final control.
    authority: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: full access 1: w&r 2: r')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # expire_time is null means the time is infinite
    expire_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SectionDocument(Base):
    __tablename__ = "section_document"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("section.id"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, nullable=False)
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[int] = mapped_column(Integer, index=True, nullable=False, comment='0: waiting to be supplemented, 1: supplementing 2: supplemented successfully 3: supplemented error')
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index(
            "uq_section_document_active",
            "section_id",
            "document_id",
            unique=True,
            postgresql_where=text("delete_at IS NULL"),
        ),
    )


class Section(Base):
    __tablename__ = "section"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    creator_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, nullable=False)
    cover: Mapped[str | None] = mapped_column(String(500), comment='The path of the cover image which you uploaded to the file system')
    description: Mapped[str | None] = mapped_column(String(500), index=True)
    md_file_name: Mapped[str | None] = mapped_column(String(500), comment='The path of the markdown file which you uploaded to the file system')
    auto_podcast: Mapped[bool] = mapped_column(Boolean, nullable=False, comment='Whether to automatically generate a podcast after uploading the markdown file')
    auto_illustration: Mapped[bool] = mapped_column(Boolean, nullable=False, comment='Whether to automatically generate illustrations for the section markdown')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped["User"] = relationship("User", backref="created_sections")


