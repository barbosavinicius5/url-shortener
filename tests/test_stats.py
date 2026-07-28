"""Tests for GET /urls/{short_code}/stats — scenarios A through F."""

import json
import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from url_shortener.application.use_cases import GetUrlStatsUseCase
from url_shortener.domain.entities import ShortUrl
from url_shortener.domain.exceptions import InvalidShortCodeFormatError, ShortUrlNotFoundError
from url_shortener.infrastructure.http.routers.stats import _get_session, router
from url_shortener.infrastructure.repositories.url_repository import SqlAlchemyUrlRepository

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_client(repo: Any) -> AsyncClient:
    """Return an AsyncClient whose stats endpoint uses *repo* as the repository.

    Uses a local inline router so that all layers below use_case are mocked.
    """
    app = FastAPI()

    from fastapi import APIRouter

    test_router = APIRouter(prefix="/urls", tags=["stats"])

    @test_router.get("/{short_code}/stats")
    async def _stats_handler(short_code: str) -> dict[str, Any]:
        use_case = GetUrlStatsUseCase(repo)
        try:
            return await use_case.execute(short_code)
        except InvalidShortCodeFormatError as exc:
            raise HTTPException(status_code=422, detail="Invalid short code format") from exc
        except ShortUrlNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Short URL not found") from exc

    app.include_router(test_router)
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _build_real_router_client(use_case: GetUrlStatsUseCase) -> AsyncClient:
    """Return an AsyncClient that uses the real stats router, patching _build_use_case."""
    app = FastAPI()

    async def _fake_session() -> Any:  # type: ignore[return]
        yield AsyncMock()

    app.dependency_overrides[_get_session] = _fake_session  # type: ignore[index]
    app.include_router(router)

    transport = ASGITransport(app=app)

    # Return a context manager that patches _build_use_case inside the router module
    class _PatchedClient:
        async def __aenter__(self) -> AsyncClient:
            self._patcher = patch(
                "url_shortener.infrastructure.http.routers.stats._build_use_case",
                return_value=use_case,
            )
            self._patcher.start()
            self._client = AsyncClient(transport=transport, base_url="http://test")
            return self._client

        async def __aexit__(self, *args: Any) -> None:
            self._patcher.stop()
            await self._client.aclose()

    return _PatchedClient()  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Scenario A — existing code with N clicks → 200, total_clicks == N
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_existing_url_returns_200_with_click_count() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = ShortUrl(
        id=1, long_url="https://example.com", short_code="abc1234", click_count=42
    )

    async with _build_client(repo) as client:
        response = await client.get("/urls/abc1234/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["short_code"] == "abc1234"
    assert data["total_clicks"] == 42


# ---------------------------------------------------------------------------
# Scenario B — valid code but not found → 404
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_b_valid_code_not_found_returns_404() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = None

    async with _build_client(repo) as client:
        response = await client.get("/urls/notfound/stats")

    assert response.status_code == 404
    assert response.json()["detail"] == "Short URL not found"


# ---------------------------------------------------------------------------
# Scenario C — existing code with 0 clicks → 200, total_clicks == 0
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_c_existing_url_zero_clicks_returns_200() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = ShortUrl(
        id=2, long_url="https://example.com/page", short_code="XYZ0000", click_count=0
    )

    async with _build_client(repo) as client:
        response = await client.get("/urls/XYZ0000/stats")

    assert response.status_code == 200
    assert response.json()["total_clicks"] == 0


# ---------------------------------------------------------------------------
# Scenario D — invalid code → 422, repository NOT called
# HTTP routing swallows truly empty paths, so we test those at the use-case layer.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_code", ["!!!", "abc def", "abc@123", "a" * 21])
async def test_d_invalid_code_returns_422_and_repo_not_called(bad_code: str) -> None:
    """Invalid codes reachable via HTTP return 422 without touching the repo."""
    repo = AsyncMock()

    async with _build_client(repo) as client:
        response = await client.get(f"/urls/{bad_code}/stats")

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid short code format"
    repo.get_by_short_code.assert_not_called()


@pytest.mark.asyncio
async def test_d_empty_code_raises_invalid_format_in_use_case() -> None:
    """Empty string is invalid Base62; use-case raises without calling repo."""
    repo = AsyncMock()
    use_case = GetUrlStatsUseCase(repo)
    with pytest.raises(InvalidShortCodeFormatError):
        await use_case.execute("")
    repo.get_by_short_code.assert_not_called()


# ---------------------------------------------------------------------------
# Scenario E — consistency: returned value matches exactly what's in the repo
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_e_returned_value_matches_repository() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = ShortUrl(
        id=99, long_url="https://consistency.test", short_code="consist1", click_count=7
    )

    async with _build_client(repo) as client:
        response = await client.get("/urls/consist1/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["short_code"] == "consist1"
    assert data["total_clicks"] == 7
    # Verify the repo was called with the exact code
    repo.get_by_short_code.assert_called_once_with("consist1")


# ---------------------------------------------------------------------------
# Scenario F — audit log emitted on every call
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_f_audit_log_emitted_on_found(caplog: pytest.LogCaptureFixture) -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = ShortUrl(
        id=3, long_url="https://log.test", short_code="logtest1", click_count=5
    )

    with caplog.at_level(logging.INFO, logger="url_shortener.stats"):
        async with _build_client(repo) as client:
            response = await client.get("/urls/logtest1/stats")

    assert response.status_code == 200
    log_messages = [r.message for r in caplog.records if r.name == "url_shortener.stats"]
    assert len(log_messages) >= 1
    log_entry = json.loads(log_messages[0])
    assert log_entry["short_code"] == "logtest1"
    assert log_entry["result"] == "found"
    assert "timestamp" in log_entry
    assert log_entry["total_clicks"] == 5


@pytest.mark.asyncio
async def test_f_audit_log_emitted_on_not_found(caplog: pytest.LogCaptureFixture) -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = None

    with caplog.at_level(logging.INFO, logger="url_shortener.stats"):
        async with _build_client(repo) as client:
            response = await client.get("/urls/missing1/stats")

    assert response.status_code == 404
    log_messages = [r.message for r in caplog.records if r.name == "url_shortener.stats"]
    assert len(log_messages) >= 1
    log_entry = json.loads(log_messages[0])
    assert log_entry["result"] == "not_found"


@pytest.mark.asyncio
async def test_f_audit_log_emitted_on_invalid_format(caplog: pytest.LogCaptureFixture) -> None:
    repo = AsyncMock()

    with caplog.at_level(logging.INFO, logger="url_shortener.stats"):
        async with _build_client(repo) as client:
            response = await client.get("/urls/bad!!code/stats")

    assert response.status_code == 422
    log_messages = [r.message for r in caplog.records if r.name == "url_shortener.stats"]
    assert len(log_messages) >= 1
    log_entry = json.loads(log_messages[0])
    assert log_entry["result"] == "invalid_format"


# ---------------------------------------------------------------------------
# Use-case unit tests (no HTTP layer)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_use_case_raises_invalid_format_for_bad_code() -> None:
    repo = AsyncMock()
    use_case = GetUrlStatsUseCase(repo)
    with pytest.raises(InvalidShortCodeFormatError):
        await use_case.execute("bad code!")
    repo.get_by_short_code.assert_not_called()


@pytest.mark.asyncio
async def test_use_case_raises_not_found_when_repo_returns_none() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = None
    use_case = GetUrlStatsUseCase(repo)
    with pytest.raises(ShortUrlNotFoundError):
        await use_case.execute("abc1234")


@pytest.mark.asyncio
async def test_use_case_returns_stats_dict() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = ShortUrl(id=1, long_url="https://x.com", short_code="abc1234", click_count=10)
    use_case = GetUrlStatsUseCase(repo)
    result = await use_case.execute("abc1234")
    assert result == {"short_code": "abc1234", "total_clicks": 10}


# ---------------------------------------------------------------------------
# Real router tests (cover infrastructure/http/routers/stats.py)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_real_router_found() -> None:
    """Cover the actual FastAPI router handler via patched _build_use_case."""
    repo = AsyncMock()
    repo.get_by_short_code.return_value = ShortUrl(
        id=10, long_url="https://real.test", short_code="real123", click_count=99
    )
    use_case = GetUrlStatsUseCase(repo)

    async with _build_real_router_client(use_case) as client:
        response = await client.get("/urls/real123/stats")

    assert response.status_code == 200
    assert response.json() == {"short_code": "real123", "total_clicks": 99}


@pytest.mark.asyncio
async def test_real_router_not_found() -> None:
    repo = AsyncMock()
    repo.get_by_short_code.return_value = None
    use_case = GetUrlStatsUseCase(repo)

    async with _build_real_router_client(use_case) as client:
        response = await client.get("/urls/missing2/stats")

    assert response.status_code == 404
    assert response.json()["detail"] == "Short URL not found"


@pytest.mark.asyncio
async def test_real_router_invalid_format() -> None:
    repo = AsyncMock()
    use_case = GetUrlStatsUseCase(repo)

    async with _build_real_router_client(use_case) as client:
        response = await client.get("/urls/bad@@code/stats")

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid short code format"


# ---------------------------------------------------------------------------
# Repository unit tests (cover url_repository.py)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_url_repository_returns_entity_when_found() -> None:
    """SqlAlchemyUrlRepository maps ORM row → ShortUrl entity correctly."""
    from url_shortener.infrastructure.db.models import ShortUrlModel

    mock_row = ShortUrlModel()
    mock_row.id = 5
    mock_row.long_url = "https://repo.test"
    mock_row.short_code = "repocode"
    mock_row.click_count = 3
    mock_row.project_id = "proj-1"

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_row

    session = AsyncMock()
    session.execute.return_value = mock_result

    repo = SqlAlchemyUrlRepository(session)
    entity = await repo.get_by_short_code("repocode")

    assert entity is not None
    assert entity.id == 5
    assert entity.long_url == "https://repo.test"
    assert entity.short_code == "repocode"
    assert entity.click_count == 3
    assert entity.project_id == "proj-1"


@pytest.mark.asyncio
async def test_url_repository_returns_none_when_not_found() -> None:
    """SqlAlchemyUrlRepository returns None when no row matches."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None

    session = AsyncMock()
    session.execute.return_value = mock_result

    repo = SqlAlchemyUrlRepository(session)
    entity = await repo.get_by_short_code("noexist")

    assert entity is None
