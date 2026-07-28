"""FastAPI application entry point."""

import logging

from fastapi import FastAPI

from url_shortener.infrastructure.http.routers.stats import router as stats_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="URL Shortener", version="0.1.0")
app.include_router(stats_router)
