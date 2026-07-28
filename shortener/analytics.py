"""Analytics event hooks (stub for t002).

Exposes the two decision points produced by the redirect endpoint so that
the analytics task (t002) can plug in event recording without touching the
redirect logic.

Contract:
  - ``on_link_acessado(code, url)``   — called when a valid code is resolved.
  - ``on_link_nao_encontrado(code)``  — called when a code is not found or invalid.

Both functions are **fire-and-forget**: any exception raised inside a handler
is silently suppressed so that analytics failures never block a redirect.

t002 registers handlers via ``register_handler``:

    from shortener.analytics import register_handler

    def my_handler(event: str, payload: dict) -> None:
        ...

    register_handler(my_handler)
"""

from __future__ import annotations

import logging
from typing import Callable

logger = logging.getLogger(__name__)

# Event name constants
EVENT_LINK_ACESSADO = "link_acessado"
EVENT_LINK_NAO_ENCONTRADO = "link_nao_encontrado"

# Registered analytics handlers (callables).
# Each receives (event_name: str, payload: dict).
_handlers: list[Callable[[str, dict], None]] = []


def register_handler(handler: Callable[[str, dict], None]) -> None:
    """Register *handler* to receive analytics events.

    A handler must accept positional args ``(event: str, payload: dict)``.
    Multiple handlers may be registered; they are called in registration order.
    """
    _handlers.append(handler)


def clear_handlers() -> None:
    """Remove all registered handlers (used in tests)."""
    _handlers.clear()


def _emit(event: str, payload: dict) -> None:
    """Dispatch *event* to all registered handlers, suppressing any exceptions."""
    for handler in list(_handlers):
        try:
            handler(event, payload)
        except Exception:  # noqa: BLE001
            logger.exception("analytics handler raised an exception (suppressed)")


def on_link_acessado(code: str, url: str) -> None:
    """Emit ``link_acessado`` event.  Called after a successful redirect."""
    _emit(EVENT_LINK_ACESSADO, {"code": code, "url": url})


def on_link_nao_encontrado(code: str) -> None:
    """Emit ``link_nao_encontrado`` event.  Called when code is missing or invalid."""
    _emit(EVENT_LINK_NAO_ENCONTRADO, {"code": code})