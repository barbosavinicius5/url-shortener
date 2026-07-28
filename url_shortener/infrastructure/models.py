"""Infrastructure: SQLAlchemy ORM model for the `urls` table."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from url_shortener.infrastructure.database import Base

_DEFAULT_PROJECT_UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")


class UrlModel(Base):
    """ORM representation of a shortened URL record."""

    __tablename__ = "urls"
    __table_args__ = (
        UniqueConstraint("project_id", "long_url", name="uq_project_long_url"),
        UniqueConstraint("short_code", name="uq_short_code"),
    )

    # Use Integer (not BigInteger) so SQLite autoincrement works in tests.
    # PostgreSQL treats INTEGER and BIGINT both as 64-bit when SERIAL is used.
    # In production, the Alembic migration uses BIGSERIAL explicitly.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Uuid type: native UUID on PG, VARCHAR(32) on SQLite - works for both
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True, native_uuid=True),
        nullable=False,
        default=_DEFAULT_PROJECT_UUID,
    )
    long_url: Mapped[str] = mapped_column(Text, nullable=False)
    short_code: Mapped[str | None] = mapped_column(String(7), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )
