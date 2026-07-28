"""SQLAlchemy async implementation of UrlRepositoryPort."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.domain.entities import ShortUrl
from url_shortener.infrastructure.db.models import ShortUrlModel


class SqlAlchemyUrlRepository:
    """Concrete repository backed by PostgreSQL via SQLAlchemy async."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_short_code(self, short_code: str) -> ShortUrl | None:
        """Fetch a ShortUrl entity by its short_code, or return None."""
        stmt = select(ShortUrlModel).where(ShortUrlModel.short_code == short_code)
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return ShortUrl(
            id=row.id,
            long_url=row.long_url,
            short_code=row.short_code,
            click_count=row.click_count,
            project_id=row.project_id,
        )
