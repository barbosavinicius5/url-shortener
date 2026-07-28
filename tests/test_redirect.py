from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from url_shortener.domain.entities import Link
from url_shortener.infrastructure.database import get_session
from url_shortener.infrastructure.repositories import SqlAlchemyLinkReadRepository
from url_shortener.main import app

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def test_redirect_302_default(client):
    """Cenário A: código existente sem is_permanent → 302"""
    link = Link(short_code="abc1234", original_url="https://example.com", is_permanent=False)

    async def mock_get_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = mock_get_session

    with patch.object(SqlAlchemyLinkReadRepository, "get_by_short_code", new=AsyncMock(return_value=link)):
        resp = await client.get("/abc1234", follow_redirects=False)

    app.dependency_overrides.clear()
    assert resp.status_code == 302
    assert resp.headers["location"] == "https://example.com"


async def test_redirect_301_permanent(client):
    """Cenário B: código existente com is_permanent=True → 301"""
    link = Link(short_code="abc1234", original_url="https://example.com", is_permanent=True)

    async def mock_get_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = mock_get_session

    with patch.object(SqlAlchemyLinkReadRepository, "get_by_short_code", new=AsyncMock(return_value=link)):
        resp = await client.get("/abc1234", follow_redirects=False)

    app.dependency_overrides.clear()
    assert resp.status_code == 301
    assert resp.headers["location"] == "https://example.com"


async def test_redirect_404_not_found(client):
    """Cenário C: código inexistente → 404 sem Location"""

    async def mock_get_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = mock_get_session

    with patch.object(SqlAlchemyLinkReadRepository, "get_by_short_code", new=AsyncMock(return_value=None)):
        resp = await client.get("/naoexiste", follow_redirects=False)

    app.dependency_overrides.clear()
    assert resp.status_code == 404
    assert "location" not in resp.headers
    assert "não encontrado" in resp.text.lower() or "nao encontrado" in resp.text.lower()


async def test_log_emitted_on_redirect(client, caplog):
    """Cenário D: log estruturado emitido em qualquer request"""
    import logging

    link = Link(short_code="abc1234", original_url="https://example.com", is_permanent=False)

    async def mock_get_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = mock_get_session

    with patch.object(SqlAlchemyLinkReadRepository, "get_by_short_code", new=AsyncMock(return_value=link)):
        with caplog.at_level(logging.INFO, logger="url_shortener.application.use_cases"):
            resp = await client.get("/abc1234", follow_redirects=False)

    app.dependency_overrides.clear()
    assert resp.status_code == 302
    assert any("redirect_resolve" in r.message for r in caplog.records)


async def test_log_emitted_on_404(client, caplog):
    """Cenário D: log emitido mesmo em 404"""
    import logging

    async def mock_get_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = mock_get_session

    with patch.object(SqlAlchemyLinkReadRepository, "get_by_short_code", new=AsyncMock(return_value=None)):
        with caplog.at_level(logging.INFO, logger="url_shortener.application.use_cases"):
            resp = await client.get("/naoexiste", follow_redirects=False)

    app.dependency_overrides.clear()
    assert resp.status_code == 404
    assert any("redirect_resolve" in r.message for r in caplog.records)
