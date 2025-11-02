from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class RSSServer(Base):
    __tablename__ = 'rss_server'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    description: Mapped[Optional[str]] = mapped_column(String(2000))
    cover: Mapped[Optional[str]] = mapped_column(String(500))
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('user.id'))


class RSSDocument(Base):
    __tablename__ = 'rss_document'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey('document.id'))
    rss_server_id: Mapped[Optional[int]] = mapped_column(ForeignKey('rss_server.id'))
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class RSSSection(Base):
    __tablename__ = 'rss_section'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[Optional[int]] = mapped_column(ForeignKey('section.id'))
    rss_server_id: Mapped[Optional[int]] = mapped_column(ForeignKey('rss_server.id'))
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
