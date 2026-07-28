"""Application ports — repository interfaces (Protocols)."""

from typing import Protocol

from url_shortener.domain.entities import ShortUrl


class UrlRepositoryPort(Protocol):
    """Port (interface) for URL persistence operations."""

    async def get_by_short_code(self, short_code: str) -> ShortUrl | None:
        """Return the ShortUrl entity matching *short_code*, or None if absent."""
        ...
