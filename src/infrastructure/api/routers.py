"""Roteadores FastAPI para os endpoints do URL shortener."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from src.domain.exceptions import InvalidUrlError, ShortCodeNotFoundError
from src.infrastructure.api.dependencies import ResolveUseCaseDep, ShortenUseCaseDep, StatsUseCaseDep
from src.infrastructure.api.schemas import ShortenRequest, ShortenResponse, StatsResponse

router = APIRouter()


@router.post("/urls", response_model=ShortenResponse, status_code=201)
async def shorten_url(
    body: ShortenRequest,
    use_case: ShortenUseCaseDep,
) -> ShortenResponse:
    """Encurta uma URL e retorna o código curto gerado."""
    try:
        short_url = await use_case.execute(body.url)
    except InvalidUrlError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ShortenResponse(short_code=short_url.short_code, original_url=short_url.original_url)


@router.get("/{short_code}")
async def redirect_url(
    short_code: str,
    use_case: ResolveUseCaseDep,
) -> RedirectResponse:
    """Redireciona para a URL original dado um código curto."""
    try:
        short_url = await use_case.execute(short_code)
    except ShortCodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RedirectResponse(url=short_url.original_url, status_code=302)


@router.get("/urls/{short_code}/stats", response_model=StatsResponse)
async def get_stats(
    short_code: str,
    use_case: StatsUseCaseDep,
) -> StatsResponse:
    """Retorna estatísticas de acesso de um código curto."""
    try:
        short_url = await use_case.execute(short_code)
    except ShortCodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return StatsResponse(
        short_code=short_url.short_code,
        original_url=short_url.original_url,
        click_count=short_url.click_count,
    )
