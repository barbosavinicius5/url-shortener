from fastapi import FastAPI

from app.database import create_tables
from app.router import router

app = FastAPI(title="URL Shortener")

create_tables()

app.include_router(router)