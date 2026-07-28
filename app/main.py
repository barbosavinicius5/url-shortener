from fastapi import FastAPI

from app.routers import shortener as shortener_router

app = FastAPI(title="URL Shortener", version="0.1.0")

app.include_router(shortener_router.router)