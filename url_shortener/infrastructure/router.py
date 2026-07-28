"""Infrastructure: FastAPI router for the URL shortener API."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.application.use_cases import ShortenResultKind, shorten_url
from url_shortener.domain.url import InvalidUrlError
from url_shortener.infrastructure.repository import SqlUrlRepository
from url_shortener.infrastructure.schemas import ShortenRequest, ShortenResponse
from url_shortener.infrastructure.session_dep import get_session

router = APIRouter()


@router.post("/urls", response_model=ShortenResponse, status_code=201)
async def post_urls(
    body: ShortenRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShortenResponse:
    """Shorten a long URL.

    Returns 201 if newly created, 200 if the URL was already shortened (idempotent).
    """
    base_url = str(request.base_url).rstrip("/")

    repo = SqlUrlRepository(session)

    try:
        result = await shorten_url(
            long_url_raw=body.long_url,
            repository=repo,
            base_url=base_url,
        )
    except InvalidUrlError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    await session.commit()

    entity = result.short_url_entity
    short_url_str = f"{base_url}/{entity.short_code}"

    if result.kind is ShortenResultKind.EXISTING:
        response.status_code = 200

    return ShortenResponse(short_code=entity.short_code, short_url=short_url_str)
