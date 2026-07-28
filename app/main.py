from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import redirect, shorten, stats


@asynccontextmanager
async def lifespan(application: FastAPI):
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="URL Shortener", lifespan=lifespan)

app.include_router(stats.router)
app.include_router(shorten.router)
app.include_router(redirect.router)