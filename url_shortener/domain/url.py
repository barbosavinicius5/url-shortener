"""Domain layer: ShortUrl entity, URL validation and Base62 encoding.

Zero external dependencies -- only stdlib.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from urllib.parse import urlparse
from uuid import UUID

# ---------------------------------------------------------------------------
# Base62
# ---------------------------------------------------------------------------

_BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
_BASE62_LENGTH = 7
_BASE62_RE = re.compile(r"^[0-9A-Za-z]{7}$")


def base62_encode(number: int) -> str:
    """Encode a non-negative integer as a zero-padded 7-char Base62 string."""
    if number < 0:
        raise ValueError(f"base62_encode requires a non-negative integer, got {number}")

    base = len(_BASE62_ALPHABET)
    digits: list[str] = []
    n = number
    while n:
        digits.append(_BASE62_ALPHABET[n % base])
        n //= base

    # Pad to exactly _BASE62_LENGTH chars
    while len(digits) < _BASE62_LENGTH:
        digits.append(_BASE62_ALPHABET[0])

    return "".join(reversed(digits))[-_BASE62_LENGTH:]


def is_valid_short_code(code: str) -> bool:
    """Return True if *code* is a valid 7-char Base62 string."""
    return bool(_BASE62_RE.match(code))


# ---------------------------------------------------------------------------
# URL validation
# ---------------------------------------------------------------------------

_ALLOWED_SCHEMES = {"http", "https"}


class InvalidUrlError(ValueError):
    """Raised when a URL fails domain-level validation."""


def validate_long_url(raw: str) -> str:
    """Validate and normalise *raw* as a long URL.

    Returns the stripped URL string on success.
    Raises :class:`InvalidUrlError` on failure.
    """
    stripped = raw.strip()
    if not stripped:
        raise InvalidUrlError("long_url must not be empty or whitespace")

    try:
        parsed = urlparse(stripped)
    except Exception as exc:  # pragma: no cover
        raise InvalidUrlError(f"long_url is not parseable: {exc}") from exc

    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise InvalidUrlError(
            f"long_url scheme '{parsed.scheme}' is not allowed; use http or https"
        )

    if not parsed.netloc:
        raise InvalidUrlError("long_url must have a non-empty network location (netloc)")

    return stripped


# ---------------------------------------------------------------------------
# Domain entity
# ---------------------------------------------------------------------------

_DEFAULT_PROJECT_ID = UUID("00000000-0000-0000-0000-000000000001")


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class ShortUrl:
    """Immutable-ish domain entity representing a shortened URL record."""

    id: int
    project_id: UUID
    long_url: str
    short_code: str
    created_at: datetime = field(default_factory=_utcnow)

    # ------------------------------------------------------------------
    # Factory helpers
    # ------------------------------------------------------------------

    @classmethod
    def from_id(
        cls,
        record_id: int,
        long_url: str,
        project_id: UUID = _DEFAULT_PROJECT_ID,
        created_at: datetime | None = None,
    ) -> "ShortUrl":
        """Create a :class:`ShortUrl` generating the short_code from *record_id*."""
        code = base62_encode(record_id)
        return cls(
            id=record_id,
            project_id=project_id,
            long_url=long_url,
            short_code=code,
            created_at=created_at or _utcnow(),
        )
