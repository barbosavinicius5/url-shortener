from fastapi import FastAPI

from app.database import create_db
from app.routers import redirect

app = FastAPI(title="URL Shortener")


@app.on_event("startup")
def startup():
    create_db()


app.include_router(redirect.router)
