"""In-memory persistence layer.

Maps short codes → original URLs.  Suitable for development and testing;
swap with a database-backed implementation when needed.
"""

from typing import Optional

# Module-level store — one instance per process lifetime.
_store: dict[str, str] = {}


def save(code: str, url: str) -> None:
    """Persist *code* → *url* mapping."""
    _store[code] = url


def get(code: str) -> Optional[str]:
    """Return the original URL for *code*, or ``None`` if not found."""
    return _store.get(code)


def clear() -> None:
    """Remove all stored mappings (used in tests)."""
    _store.clear()