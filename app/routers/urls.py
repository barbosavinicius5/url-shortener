"""Router: operações sobre URLs encurtadas (encurtar e redirecionar)."""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from app.analytics import emitir_evento
from app.repositorio import repositorio
from app.models import UrlEncurtada
from app.schemas import UrlEncurtarRequest, UrlEncurtadaResponse

router = APIRouter(tags=["urls"])


@router.post("/encurtar", response_model=UrlEncurtadaResponse, status_code=201)
def encurtar_url(body: UrlEncurtarRequest) -> UrlEncurtadaResponse:
    """Encurta uma URL e retorna o código curto gerado."""
    codigo_curto = secrets.token_urlsafe(6)
    url = UrlEncurtada(codigo_curto=codigo_curto, url_original=body.url_original)
    repositorio.salvar(url)

    emitir_evento(
        "url_encurtada",
        {
            "codigo_curto": codigo_curto,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    return UrlEncurtadaResponse(
        codigo_curto=codigo_curto, url_original=body.url_original
    )


@router.get("/{codigo_curto}", status_code=302)
def redirecionar(codigo_curto: str) -> RedirectResponse:
    """Redireciona para a URL original e contabiliza o clique."""
    url = repositorio.incrementar_cliques(codigo_curto)
    if url is None:
        raise HTTPException(status_code=404, detail="Código curto não encontrado")

    emitir_evento(
        "codigo_acessado",
        {
            "codigo_curto": codigo_curto,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    return RedirectResponse(url=url.url_original, status_code=302)