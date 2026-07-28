"""FastAPI application — URL Shortener."""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from shortener import codegen, storage

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Templates directory
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


class DadoAcesso(BaseModel):
    acessado_em: str


class MetricasResponse(BaseModel):
    codigo: str
    total_cliques: int
    dados_acesso: list[DadoAcesso]


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
    storage.save(code, body.url)

    short_url = f"{BASE_URL.rstrip('/')}/{code}"
    return ShortenResponse(code=code, short_url=short_url)


@app.get("/metricas", response_class=HTMLResponse)
def metricas_ui(request: Request) -> HTMLResponse:
    """Serve the metrics query UI page."""
    return templates.TemplateResponse(request, "metricas.html")


@app.get("/metricas/{codigo}", response_model=MetricasResponse)
def metricas(codigo: str) -> MetricasResponse:
    """Return access metrics for a short code.

    - **200** with ``{ codigo, total_cliques, dados_acesso }`` when found.
    - **400** when *codigo* is blank/whitespace.
    - **404** when *codigo* is not registered.
    """
    codigo = codigo.strip()
    if not codigo:
        raise HTTPException(
            status_code=400,
            detail={"erro": "codigo_invalido", "mensagem": "Informe um código válido."},
        )

    access_log = storage.get_access_log(codigo)
    if access_log is None:
        raise HTTPException(
            status_code=404,
            detail={"erro": "codigo_nao_encontrado", "mensagem": "Código não encontrado."},
        )

    dados_acesso = [DadoAcesso(acessado_em=ts) for ts in access_log]
    return MetricasResponse(
        codigo=codigo,
        total_cliques=len(access_log),
        dados_acesso=dados_acesso,
    )


@app.get("/{code}", status_code=302)
def redirect(code: str) -> RedirectResponse:
    """Resolve a short code and redirect to the original URL.

    - Returns **302** with ``Location`` header set to the original URL.
    - Returns **404** if *code* is not found.
    - Increments ``access_count`` on every successful resolution.
    """
    url = storage.get(code)
    if url is None:
        raise HTTPException(status_code=404, detail="Short code not found")

    storage.increment_access_count(code)
    return RedirectResponse(url=url, status_code=302)