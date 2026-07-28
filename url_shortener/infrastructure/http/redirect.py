import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.application.use_cases import ResolveShortCodeUseCase
from url_shortener.infrastructure.database import get_session
from url_shortener.infrastructure.repositories import SqlAlchemyLinkReadRepository

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{short_code}")
async def redirect_short_code(
    short_code: str,
    session: AsyncSession = Depends(get_session),
) -> RedirectResponse:
    repo = SqlAlchemyLinkReadRepository(session)
    use_case = ResolveShortCodeUseCase(repo)
    result = await use_case.execute(short_code)

    if not result.found:
        raise HTTPException(status_code=404, detail="short code não encontrado")

    status_code = 301 if result.link.is_permanent else 302  # type: ignore[union-attr]
    return RedirectResponse(url=result.link.original_url, status_code=status_code)  # type: ignore[union-attr]
