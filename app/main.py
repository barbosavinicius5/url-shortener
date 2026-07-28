"""Ponto de entrada da aplicação Encurtador de URL v3."""

from fastapi import FastAPI

from app.routers import urls, stats

app = FastAPI(
    title="Encurtador de URL v3",
    description="API para encurtar URLs, redirecionar e medir cliques.",
    version="0.1.0",
)

app.include_router(urls.router)
app.include_router(stats.router)