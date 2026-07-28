"""Application layer: repository port (abstract interface).

No FastAPI or SQLAlchemy imports here — only stdlib and domain.
"""
from __future__ import annotations

from typing import Protocol
from uuid import UUID

from url_shortener.domain.url import ShortUrl


class UrlRepository(Protocol):
    """Port: persistence contract for :class:`ShortUrl` aggregates."""

    async def get_by_long_url(self, project_id: UUID, long_url: str) -> ShortUrl | None:
        """Return the existing record for *(project_id, long_url)* or *None*."""
        ...

    async def insert_pending(self, project_id: UUID, long_url: str) -> int:
        """Insert a new record WITHOUT a short_code yet and return its *id*."""
        ...

    async def update_short_code(self, record_id: int, short_code: str) -> None:
        """Persist the generated *short_code* for the record identified by *record_id*."""
        ...
