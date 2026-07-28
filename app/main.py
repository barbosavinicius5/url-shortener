"""Aplicação FastAPI — Encurtador de URL v3."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import Depends, FastAPI, Request
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.models import Base, Evento, UrlCurta
from app.schemas import ShortenRequest, ShortenResponse
from app.shortener import gerar_codigo_unico


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Cria tabelas na inicialização (idempotente via CREATE IF NOT EXISTS)."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Encurtador de URL v3", lifespan=lifespan)

# URL base usada para montar url_curta; pode ser sobrescrita via variável de
# ambiente em produção, mas para fins de desenvolvimento usa-se o host do request.
_BASE_URL_OVERRIDE: str | None = None


def _base_url(request: Request) -> str:
    if _BASE_URL_OVERRIDE:
        return _BASE_URL_OVERRIDE.rstrip("/")
    return str(request.base_url).rstrip("/")


@app.post("/shorten", response_model=ShortenResponse, status_code=201)
def encurtar_url(
    body: ShortenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ShortenResponse:
    """
    Recebe ``{"url_destino": "..."}`` e retorna o código curto gerado.

    - Valida a URL via Pydantic antes de qualquer I/O (fail-fast).
    - Gera código base62 único com retry em colisão.
    - Persiste em SQLite e registra evento ``url_encurtada``.
    """
    url_destino = str(body.url_destino)

    # Geração de código único (colisões tratadas internamente)
    codigo_curto = gerar_codigo_unico(db)

    # Persistência durável
    registro = UrlCurta(codigo_curto=codigo_curto, url_destino=url_destino)
    db.add(registro)

    # Evento de domínio
    evento = Evento(
        tipo="url_encurtada",
        codigo_curto=codigo_curto,
        url_destino=url_destino,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(evento)

    db.commit()

    url_curta = f"{_base_url(request)}/{codigo_curto}"
    return ShortenResponse(codigo_curto=codigo_curto, url_curta=url_curta)
