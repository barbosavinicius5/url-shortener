import re
import random
import string
from typing import Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ShortenRequest(BaseModel):
    url_original: str


class ShortenResponse(BaseModel):
    codigo_curto: str
    url_original: str
    link_encurtado: str


class MetricaResponse(BaseModel):
    codigo_curto: str
    total_cliques: int


class ErrorResponse(BaseModel):
    detail: str


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Encurtador de URL v5",
    description="API para encurtamento de URLs com redirecionamento e telemetria de cliques.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------------------------
# Persistência in-memory
# ---------------------------------------------------------------------------

db: Dict[str, dict] = {}  # {codigo_curto: {url_original, total_cliques}}


def gerar_codigo(tamanho: int = 6) -> str:
    alfabeto = string.ascii_letters + string.digits
    while True:
        codigo = "".join(random.choices(alfabeto, k=tamanho))
        if codigo not in db:
            return codigo


def validar_url(url: str) -> bool:
    pattern = re.compile(r"^https?://.+")
    return bool(pattern.match(url))


# ---------------------------------------------------------------------------
# Exception handler de fallback
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Documentação temporariamente indisponível. Tente novamente em instantes."
            },
        )
    return JSONResponse(
        status_code=500, content={"detail": "Erro interno do servidor."}
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post(
    "/shorten",
    response_model=ShortenResponse,
    status_code=201,
    summary="Encurtar URL",
    description="Recebe uma URL longa e retorna um código curto único.",
    responses={
        201: {"description": "URL encurtada com sucesso", "model": ShortenResponse},
        400: {"description": "URL inválida ou esquema não permitido", "model": ErrorResponse},
        422: {"description": "Erro de validação dos dados de entrada", "model": ErrorResponse},
    },
    tags=["Encurtamento"],
)
async def encurtar_url(body: ShortenRequest, request: Request):
    if not validar_url(body.url_original):
        raise HTTPException(status_code=400, detail="URL inválida. Use http:// ou https://.")

    codigo = gerar_codigo()
    db[codigo] = {"url_original": body.url_original, "total_cliques": 0}

    base_url = str(request.base_url).rstrip("/")
    return ShortenResponse(
        codigo_curto=codigo,
        url_original=body.url_original,
        link_encurtado=f"{base_url}/{codigo}",
    )


@app.get(
    "/{codigo_curto}/stats",
    response_model=MetricaResponse,
    summary="Consultar métricas de cliques",
    description="Retorna o total de cliques de um código curto.",
    responses={
        200: {"description": "Métricas retornadas com sucesso", "model": MetricaResponse},
        404: {"description": "Código curto não encontrado", "model": ErrorResponse},
    },
    tags=["Métricas"],
)
async def consultar_stats(codigo_curto: str):
    entrada = db.get(codigo_curto)
    if entrada is None:
        raise HTTPException(status_code=404, detail="Código curto não encontrado.")
    return MetricaResponse(
        codigo_curto=codigo_curto,
        total_cliques=entrada["total_cliques"],
    )


@app.get(
    "/{codigo_curto}",
    status_code=302,
    summary="Redirecionar por código curto",
    description="Redireciona para a URL original associada ao código curto.",
    responses={
        302: {"description": "Redirecionamento para a URL original"},
        404: {"description": "Código curto não encontrado", "model": ErrorResponse},
    },
    tags=["Redirecionamento"],
)
async def redirecionar(codigo_curto: str):
    entrada = db.get(codigo_curto)
    if entrada is None:
        raise HTTPException(status_code=404, detail="Código curto não encontrado.")
    entrada["total_cliques"] += 1
    return RedirectResponse(url=entrada["url_original"], status_code=302)