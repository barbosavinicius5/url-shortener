"""Infrastructure: FastAPI dependency for async database sessions."""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from url_shortener.infrastructure.database import async_session_factory


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional async session; roll back on exception."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
