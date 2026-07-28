from fastapi import FastAPI

from app.database import engine, Base
from app.routers import redirect

Base.metadata.create_all(bind=engine)

app = FastAPI(title="URL Shortener")

app.include_router(redirect.router)