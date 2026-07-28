"""Infrastructure: async SQLAlchemy implementation of UrlRepository port."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.domain.url import ShortUrl
from url_shortener.infrastructure.models import UrlModel

_DEFAULT_PROJECT_UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")


class SqlUrlRepository:
    """Concrete async repository backed by SQLAlchemy + PostgreSQL (or SQLite for tests)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_long_url(self, project_id: uuid.UUID, long_url: str) -> ShortUrl | None:
        stmt = select(UrlModel).where(
            UrlModel.project_id == project_id,
            UrlModel.long_url == long_url,
        )
        result = await self._session.execute(stmt)
        row: UrlModel | None = result.scalar_one_or_none()
        if row is None:
            return None
        return _model_to_entity(row)

    async def insert_pending(self, project_id: uuid.UUID, long_url: str) -> int:
        """Insert a record with NULL short_code and return its auto-generated id."""
        record = UrlModel(
            project_id=project_id,
            long_url=long_url,
            short_code=None,
            created_at=datetime.now(UTC),
        )
        self._session.add(record)
        await self._session.flush()  # populates record.id without committing
        assert record.id is not None, "DB must return an id after flush"
        return int(record.id)

    async def update_short_code(self, record_id: int, short_code: str) -> None:
        stmt = update(UrlModel).where(UrlModel.id == record_id).values(short_code=short_code)
        await self._session.execute(stmt)


def _model_to_entity(row: UrlModel) -> ShortUrl:
    assert row.short_code is not None, "short_code must be set before converting to entity"
    created: datetime
    if isinstance(row.created_at, datetime):
        created = row.created_at
    else:
        created = datetime.now(UTC)
    return ShortUrl(
        id=int(row.id),
        project_id=uuid.UUID(str(row.project_id)),
        long_url=str(row.long_url),
        short_code=str(row.short_code),
        created_at=created,
    )
