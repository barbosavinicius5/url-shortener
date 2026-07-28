"""FastAPI application — URL Shortener."""

import os
import re

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from shortener import codegen, storage

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Regex that defines a valid short code: 1–32 alphanumeric chars.
_CODIGO_RE = re.compile(r"^[A-Za-z0-9]{1,32}$")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    code: str
    short_url: str


class DadoAcesso(BaseModel):
    acessado_em: str  # ISO-8601 string (UTC)


class MetricasResponse(BaseModel):
    codigo: str
    total_cliques: int
    dados_acesso: list[DadoAcesso]


class ErroResponse(BaseModel):
    erro: str
    mensagem: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten(body: ShortenRequest) -> ShortenResponse:
    """Shorten a URL.

    **Request body**: ``{ "url": "<string>" }``

    - Validates that the URL starts with ``http://`` or ``https://``.
    - Generates a unique short code via the code-generation layer.
    - Persists the mapping and returns ``{ code, short_url }``.\
    """
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    code = codegen.generate_code()
    storage.save(code, body.url)

    short_url = f"{BASE_URL.rstrip('/')}/{code}"
    return ShortenResponse(code=code, short_url=short_url)


@app.get(
    "/metricas/{codigo}",
    response_model=MetricasResponse,
    status_code=200,
    responses={
        400: {"model": ErroResponse},
        404: {"model": ErroResponse},
    },
)
def consultar_metricas(codigo: str) -> MetricasResponse:
    """Retorna as métricas de acesso de um código curto (somente-leitura).

    - **200** com ``total_cliques`` e ``dados_acesso`` quando o código existe.
    - **404** quando o código não existe no repositório.
    - **400** quando o ``codigo`` está vazio ou fora do padrão alfanumérico.
    - Operação somente-leitura: não gera novos eventos de analytics.
    """
    # Cenário D — código malformado/vazio → 400
    if not codigo or not _CODIGO_RE.match(codigo):
        raise HTTPException(
            status_code=400,
            detail={"erro": "codigo_invalido", "mensagem": "Informe um código válido."},
        )

    # Cenário C — código inexistente → 404
    if not storage.code_exists(codigo):
        raise HTTPException(
            status_code=404,
            detail={"erro": "codigo_nao_encontrado", "mensagem": "Código não encontrado."},
        )

    # Cenários A / B — código existente (com ou sem acessos) → 200
    events = storage.get_events(codigo)  # always a list when code exists
    total_cliques = len(events)
    dados_acesso = [
        DadoAcesso(acessado_em=ev["acessado_em"].strftime("%Y-%m-%dT%H:%M:%SZ"))
        for ev in events
    ]

    return MetricasResponse(
        codigo=codigo,
        total_cliques=total_cliques,
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