"""In-memory persistence layer.

Maps short codes -> original URLs.  Suitable for development and testing;
swap with a database-backed implementation when needed.

Each entry is stored as a dict with keys:
    - ``url``: the original long URL.
    - ``access_count``: number of times the short code has been resolved.
    - ``access_log``: list of ISO-8601 timestamps (str) of each access.
"""

from datetime import datetime, timezone
from typing import Optional

# Module-level store -- one instance per process lifetime.
# Structure: { code: {"url": str, "access_count": int, "access_log": list[str]} }
_store: dict[str, dict] = {}


def save(code: str, url: str) -> None:
    """Persist *code* -> *url* mapping with ``access_count`` initialised to 0."""
    _store[code] = {"url": url, "access_count": 0, "access_log": []}


def get(code: str) -> Optional[str]:
    """Return the original URL for *code*, or ``None`` if not found."""
    entry = _store.get(code)
    return entry["url"] if entry is not None else None


def increment_access_count(code: str) -> None:
    """Increment the access counter for *code* by 1 and record the timestamp.

    Silently ignores unknown codes (should not happen in normal flow).
    """
    entry = _store.get(code)
    if entry is not None:
        entry["access_count"] += 1
        entry["access_log"].append(
            datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        )


def get_access_count(code: str) -> Optional[int]:
    """Return the current ``access_count`` for *code*, or ``None`` if not found."""
    entry = _store.get(code)
    return entry["access_count"] if entry is not None else None


def get_access_log(code: str) -> Optional[list[str]]:
    """Return the list of access timestamps for *code*, or ``None`` if not found."""
    entry = _store.get(code)
    return list(entry["access_log"]) if entry is not None else None


def clear() -> None:
    """Remove all stored mappings (used in tests)."""
    _store.clear()