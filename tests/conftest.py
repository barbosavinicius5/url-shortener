"""Fixtures compartilhadas para todos os testes."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.infrastructure.api.app import create_app
from src.infrastructure.api.dependencies import get_repository
from src.infrastructure.persistence.memory_repository import InMemoryUrlRepository


@pytest.fixture()
def memory_repo() -> InMemoryUrlRepository:
    """Repositório em memória isolado por teste."""
    return InMemoryUrlRepository()


@pytest.fixture()
def app(memory_repo: InMemoryUrlRepository):  # type: ignore[no-untyped-def]
    """Instância isolada da aplicação com repositório em memória."""
    application = create_app()

    async def override_repo():  # type: ignore[no-untyped-def]
        yield memory_repo

    application.dependency_overrides[get_repository] = override_repo
    return application


@pytest_asyncio.fixture()
async def client(app):  # type: ignore[no-untyped-def]
    """AsyncClient pronto para uso nos testes."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
