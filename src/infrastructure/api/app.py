"""Entrypoint FastAPI — cria e configura a aplicação."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.infrastructure.api.routers import router
from src.infrastructure.logging.setup import setup_logging
from src.infrastructure.middleware.logging_middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa o logging estruturado antes de aceitar requisições."""
    setup_logging()
    yield


def create_app() -> FastAPI:
    """Fábrica de aplicação — facilita testes com instâncias isoladas."""
    application = FastAPI(
        title="URL Shortener",
        description="Encurtador de URL async com logging estruturado JSON.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Middleware de logging — deve ser adicionado antes dos routers
    application.add_middleware(LoggingMiddleware)

    application.include_router(router)

    return application


app = create_app()
