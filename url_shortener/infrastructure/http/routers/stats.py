"""FastAPI router for GET /urls/{short_code}/stats."""

from collections.abc import AsyncGenerator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.application.use_cases import GetUrlStatsUseCase
from url_shortener.domain.exceptions import InvalidShortCodeFormatError, ShortUrlNotFoundError
from url_shortener.infrastructure.db.session import AsyncSessionFactory
from url_shortener.infrastructure.repositories.url_repository import SqlAlchemyUrlRepository

router = APIRouter(prefix="/urls", tags=["stats"])


async def _get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency: yield an async DB session."""
    async with AsyncSessionFactory() as session:
        yield session


def _build_use_case(session: AsyncSession) -> GetUrlStatsUseCase:
    """Factory: create a GetUrlStatsUseCase from an async session."""
    repository = SqlAlchemyUrlRepository(session)
    return GetUrlStatsUseCase(repository)


@router.get("/{short_code}/stats")
async def get_url_stats(
    short_code: str,
    session: Annotated[AsyncSession, Depends(_get_session)],
) -> dict[str, Any]:
    """Return click statistics for the given short URL."""
    use_case = _build_use_case(session)

    try:
        return await use_case.execute(short_code)
    except InvalidShortCodeFormatError as exc:
        raise HTTPException(status_code=422, detail="Invalid short code format") from exc
    except ShortUrlNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Short URL not found") from exc
