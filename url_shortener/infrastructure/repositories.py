from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.domain.entities import Link
from url_shortener.domain.ports import AbstractLinkReadRepository
from url_shortener.infrastructure.models import LinkModel


class SqlAlchemyLinkReadRepository(AbstractLinkReadRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_short_code(self, short_code: str) -> Optional[Link]:
        stmt = select(LinkModel).where(LinkModel.short_code == short_code)
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return Link(
            short_code=row.short_code,
            original_url=row.original_url,
            is_permanent=bool(row.is_permanent),
        )
