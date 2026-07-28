from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.shortener import ShortenRequest, ShortenResponse, ErrorResponse
from app.services.shortener import shorten, InvalidURLError

router = APIRouter()


@router.post(
    "/shorten",
    status_code=201,
    response_model=ShortenResponse,
    responses={422: {"model": ErrorResponse}},
)
def create_short_url(body: ShortenRequest) -> JSONResponse:
    """Encurta uma URL e retorna o código gerado."""
    try:
        result = shorten(body.url_original)
        return JSONResponse(status_code=201, content=result)
    except InvalidURLError as exc:
        return JSONResponse(
            status_code=422,
            content={"erro": True, "motivo": str(exc)},
        )