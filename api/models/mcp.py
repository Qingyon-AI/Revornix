from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class MCPServer(Base):
    __tablename__ = 'mcp_server'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    category: Mapped[int] = mapped_column(Integer, nullable=False, index=True, comment='0: std, 1: stream')
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    enable: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('user.id'))


class StdMCP(Base):
    __tablename__ = 'std_mcp'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cmd: Mapped[Optional[str]] = mapped_column(String(200))
    args: Mapped[Optional[str]] = mapped_column(String(300))
    env: Mapped[Optional[str]] = mapped_column(String(500))
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    server_id: Mapped[Optional[int]] = mapped_column(ForeignKey('mcp_server.id'))


class HttpMCP(Base):
    __tablename__ = 'http_mcp'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url: Mapped[Optional[str]] = mapped_column(String(200))
    headers: Mapped[Optional[str]] = mapped_column(String(500))
    create_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    update_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    server_id: Mapped[Optional[int]] = mapped_column(ForeignKey('mcp_server.id'))
