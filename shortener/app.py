"""FastAPI application — URL Shortener."""

import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from shortener import codegen, storage
from shortener.analytics.service import analytics_service

logger = logging.getLogger(__name__)

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Jinja2 templates directory (relative to this file).
_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    code: str
    short_url: str


class CliquesResponse(BaseModel):
    codigo: str
    cliques: int


class StatsResponse(BaseModel):
    codigo_curto: str
    cliques: int


# ---------------------------------------------------------------------------
# Helpers de analytics (fire-and-forget seguro)
# ---------------------------------------------------------------------------

def _registrar_link_acessado(
    codigo: str,
    referrer: Optional[str],
    user_agent: Optional[str],
) -> None:
    """Wrapper seguro para BackgroundTask: excecao suprimida com log."""
    try:
        analytics_service.registrar_link_acessado(codigo, referrer=referrer, user_agent=user_agent)
    except Exception:
        logger.exception("Falha em background task registrar_link_acessado")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten(body: ShortenRequest) -> ShortenResponse:
    """Shorten a URL.

    **Request body**: ``{ "url": "<string>" }``

    - Validates that the URL starts with ``http://`` or ``https://``.
    - Generates a unique short code via the code-generation layer.
    - Persists the mapping and returns ``{ code, short_url }``.
    """
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    code = codegen.generate_code()
    storage.save(code, url=body.url)

    short_url = f"{BASE_URL.rstrip('/')}/{code}"
    return ShortenResponse(code=code, short_url=short_url)


@app.get("/api/links/{codigo}/cliques", response_model=CliquesResponse)
def cliques(codigo: str) -> CliquesResponse:
    """Retorna a contagem de cliques derivada dos eventos link_acessado.

    A contagem e calculada via COUNT direto nos eventos persistidos --
    nao existe contador separado.
    """
    total = analytics_service.contar_cliques(codigo)
    return CliquesResponse(codigo=codigo, cliques=total)


# ---------------------------------------------------------------------------
# Frontend — tela de consulta de contagem de cliques (t002-fe)
# ---------------------------------------------------------------------------

@app.get("/stats", response_class=HTMLResponse)
def stats_ui(request: Request) -> HTMLResponse:
    """Serve a tela HTML de consulta da contagem de cliques."""
    return templates.TemplateResponse(request, "stats.html")


@app.get("/{codigo_curto}/stats", response_model=StatsResponse)
def stats(codigo_curto: str) -> StatsResponse:
    """Retorna a contagem de cliques para um codigo_curto.

    - **200** com ``{ codigo_curto, cliques }`` quando o código existe.
    - **404** quando o código não está registrado.
    - **422** (FastAPI automático) se codigo_curto for vazio/inválido.
    """
    codigo_curto = codigo_curto.strip()
    if not codigo_curto:
        raise HTTPException(
            status_code=422,
            detail="codigo_curto nao pode ser vazio.",
        )

    # Verifica existência no storage antes de consultar analytics
    url = storage.get(codigo_curto)
    if url is None:
        raise HTTPException(
            status_code=404,
            detail=f"Código '{codigo_curto}' não encontrado.",
        )

    cliques_total = analytics_service.contar_cliques(codigo_curto)
    return StatsResponse(codigo_curto=codigo_curto, cliques=cliques_total)


@app.get("/{code}", status_code=302)
def redirect(code: str, request: Request, background_tasks: BackgroundTasks) -> RedirectResponse:
    """Resolve a short code and redirect to the original URL.

    - Returns **302** with ``Location`` header set to the original URL.
    - Returns **404** if *code* is not found.
    - Increments ``access_count`` on every successful resolution.

    Registro de analytics:
    - Codigo encontrado (302): BackgroundTask (nao bloqueia o redirect).
    - Codigo nao encontrado (404): chamada sincrona com try/except antes do
      raise, porque BackgroundTasks nao sao executadas com HTTPException.
      Falha e suprimida: o 404 e sempre devolvido ao visitante.
    """
    referrer: Optional[str] = request.headers.get("Referer")
    user_agent: Optional[str] = request.headers.get("User-Agent")

    url = storage.get(code)
    if url is None:
        # BackgroundTasks nao sao disparadas junto com HTTPException no Starlette.
        # Registramos o evento de forma sincrona mas com excecao suprimida,
        # garantindo que o 404 seja sempre devolvido ao visitante.
        analytics_service.registrar_link_nao_encontrado(code)
        raise HTTPException(status_code=404, detail="Short code not found")

    storage.increment_access_count(code)

    # Para o redirect bem-sucedido, usamos BackgroundTask: a resposta 302
    # e enviada imediatamente e o registro ocorre em seguida, de forma nao
    # bloqueante. O wrapper _registrar_link_acessado suprime qualquer excecao.
    background_tasks.add_task(_registrar_link_acessado, code, referrer, user_agent)

    return RedirectResponse(url=url, status_code=302)