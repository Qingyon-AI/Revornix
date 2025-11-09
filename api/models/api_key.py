from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from common.sql import Base


class ApiKey(Base):
    __tablename__ = 'api_key'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), index=True, nullable=False, comment='The id of the user who owns the API key')
    api_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), index=True, comment='The description of the API key')
    last_used_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), comment='The last time the API key was used')
    create_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delete_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
