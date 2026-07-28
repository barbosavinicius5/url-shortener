import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.schemas.encurtamento import EncurtamentoRequest, EncurtamentoResponse, ErroResponse
from app.services.dominio import criar_encurtamento

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/encurtamentos", tags=["Encurtamentos"])


@router.post(
    "",
    status_code=201,
    response_model=EncurtamentoResponse,
    responses={
        422: {"model": ErroResponse, "description": "URL inválida"},
    },
    summary="Cria um encurtamento de URL",
    description="Recebe uma URL original e retorna o código curto e o link encurtado.",
)
async def criar(payload: EncurtamentoRequest, request: Request) -> JSONResponse:
    resultado = criar_encurtamento(payload.url_original)

    base_url = str(request.base_url).rstrip("/")
    link_encurtado = f"{base_url}/{resultado['codigo_curto']}"

    logger.info("url_encurtada: %s -> %s", payload.url_original, link_encurtado)
    print(f"url_encurtada: {payload.url_original} -> {link_encurtado}")

    body = EncurtamentoResponse(
        codigo_curto=resultado["codigo_curto"],
        url_original=resultado["url_original"],
        link_encurtado=link_encurtado,
    )
    return JSONResponse(status_code=201, content=body.model_dump())
