"""FastAPI application factory."""
from __future__ import annotations

import logging
import sys

from fastapi import FastAPI

from url_shortener.infrastructure.logging_middleware import JsonLoggingMiddleware
from url_shortener.infrastructure.router import router

# ---------------------------------------------------------------------------
# Logging configuration (JSON to stdout)
# ---------------------------------------------------------------------------
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(message)s",
)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title="URL Shortener", version="0.1.0")

    app.add_middleware(JsonLoggingMiddleware)
    app.include_router(router)

    return app


app = create_app()
