import logging
import logging.config

from fastapi import FastAPI

from url_shortener.infrastructure.http.redirect import router as redirect_router

logging.basicConfig(
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
    level=logging.INFO,
)

app = FastAPI(title="URL Shortener")
app.include_router(redirect_router)
