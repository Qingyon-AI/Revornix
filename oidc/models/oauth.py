from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from common.sql import Base


class OAuth2Client(Base):
    __tablename__ = "oauth2_client"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(500))
    is_confidential: Mapped[bool] = mapped_column(Boolean, default=False)
    client_id: Mapped[str] = mapped_column(String(100), index=True, unique=True, nullable=False)
    client_secret: Mapped[str | None] = mapped_column(String(200), nullable=True)

    allowed_grant_types: Mapped[list[str]] = mapped_column(
        ARRAY(String), default=["authorization_code", "client_credentials", "password"]
    )
    redirect_uris: Mapped[str] = mapped_column(String(2000), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(
        ARRAY(String), default=["openid", "profile", "email"]
    )

    create_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(tz=timezone.utc)
    )
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OAuth2Token(Base):
    __tablename__ = "oauth2_token"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[str] = mapped_column(String(100), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), index=True, nullable=True)
    grant_type: Mapped[str] = mapped_column(String(32), default="authorization_code")
    access_token: Mapped[str] = mapped_column(String(500), unique=True)
    refresh_token: Mapped[str | None] = mapped_column(String(500), unique=True)
    scope: Mapped[str | None] = mapped_column(String(200))
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(tz=timezone.utc)
    )
    expires_in: Mapped[int] = mapped_column(Integer)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class OAuth2AuthorizationCode(Base):
    __tablename__ = "oauth2_code"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    client_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    redirect_uri: Mapped[str | None] = mapped_column(String(512))
    response_type: Mapped[str | None] = mapped_column(String(32))
    scope: Mapped[str | None] = mapped_column(String(512))
    auth_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(tz=timezone.utc)
    )
    nonce: Mapped[str | None] = mapped_column(String(255))
    code_challenge: Mapped[str | None] = mapped_column(String(255))
    code_challenge_method: Mapped[str | None] = mapped_column(String(16))
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    delete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))