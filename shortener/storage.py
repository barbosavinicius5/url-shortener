"""In-memory persistence layer.

Maps short codes -> original URLs.  Suitable for development and testing;
swap with a database-backed implementation when needed.

Each entry is stored as a dict with keys:
    - ``url``: the original long URL.
    - ``access_count``: number of times the short code has been resolved.
    - ``events``: list of dicts ``{"tipo": "link_acessado", "acessado_em": datetime}``.
"""

from datetime import datetime, timezone
from typing import Optional

# Module-level store -- one instance per process lifetime.
# Structure: { code: {"url": str, "access_count": int, "events": list[dict]} }
_store: dict[str, dict] = {}


def save(code: str, url: str) -> None:
    """Persist *code* -> *url* mapping with ``access_count`` initialised to 0."""
    _store[code] = {"url": url, "access_count": 0, "events": []}


def get(code: str) -> Optional[str]:
    """Return the original URL for *code*, or ``None`` if not found."""
    entry = _store.get(code)
    return entry["url"] if entry is not None else None


def increment_access_count(code: str) -> None:
    """Increment the access counter for *code* by 1 and record a ``link_acessado`` event.

    Silently ignores unknown codes (should not happen in normal flow).
    """
    entry = _store.get(code)
    if entry is not None:
        entry["access_count"] += 1
        entry["events"].append(
            {
                "tipo": "link_acessado",
                "acessado_em": datetime.now(tz=timezone.utc),
            }
        )


def get_access_count(code: str) -> Optional[int]:
    """Return the current ``access_count`` for *code*, or ``None`` if not found."""
    entry = _store.get(code)
    return entry["access_count"] if entry is not None else None


def get_events(code: str) -> Optional[list[dict]]:
    """Return the list of ``link_acessado`` events for *code*, or ``None`` if not found.

    Each element has ``tipo`` and ``acessado_em`` keys.
    Returns an empty list when the code exists but has never been accessed.
    """
    entry = _store.get(code)
    return entry["events"] if entry is not None else None


def code_exists(code: str) -> bool:
    """Return ``True`` if *code* is present in the store."""
    return code in _store


def clear() -> None:
    """Remove all stored mappings (used in tests)."""
    _store.clear()