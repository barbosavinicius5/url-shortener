from fastapi import FastAPI

from app.database import create_tables
from app.metrics_router import router as metrics_router
from app.router import router

app = FastAPI(title="URL Shortener")

create_tables()

# metrics_router deve ser registrado ANTES do router principal,
# pois GET /{codigo} é um path parameter genérico que capturaria /metrics.
app.include_router(metrics_router)
app.include_router(router)
