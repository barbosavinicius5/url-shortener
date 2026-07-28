"""Testes do middleware de logging JSON estruturado.

Cenários:
  A - Request bem-sucedido nos 3 endpoints: 1 log JSON com result="success".
  B - Request com falha de negócio: 1 log JSON com result="failure".
  C - Exceção não tratada: 1 log JSON de falha e exceção é propagada.
  D - Unicidade: exatamente 1 log por request (sem duplicação).
"""

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from src.infrastructure.api.app import create_app
from src.infrastructure.api.dependencies import get_repository
from src.infrastructure.middleware.logging_middleware import LoggingMiddleware
from src.infrastructure.middleware.logging_middleware import logger as middleware_logger
from src.infrastructure.persistence.memory_repository import InMemoryUrlRepository

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _count_middleware_logs(caplog_records: list[logging.LogRecord]) -> list[logging.LogRecord]:
    """Filtra apenas os registros emitidos pelo LoggingMiddleware."""
    return [r for r in caplog_records if r.name == middleware_logger.name]


def _parse_extras(record: logging.LogRecord) -> dict[str, Any]:
    """Extrai os campos extras adicionados via extra={} no middleware."""
    return {
        "timestamp": getattr(record, "timestamp", None),
        "method": getattr(record, "method", None),
        "route": getattr(record, "route", None),
        "status_code": getattr(record, "status_code", None),
        "result": getattr(record, "result", None),
        "duration_ms": getattr(record, "duration_ms", None),
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def memory_repo() -> InMemoryUrlRepository:
    return InMemoryUrlRepository()


@pytest.fixture()
def app(memory_repo: InMemoryUrlRepository) -> FastAPI:
    """Aplicação isolada com repositório em memória."""
    application = create_app()

    async def override_repo() -> AsyncGenerator[InMemoryUrlRepository, None]:
        yield memory_repo

    application.dependency_overrides[get_repository] = override_repo
    return application


@pytest_asyncio.fixture()
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture()
async def seeded_client(
    app: FastAPI,
    memory_repo: InMemoryUrlRepository,
) -> AsyncGenerator[tuple[AsyncClient, str], None]:
    """Client com uma URL já encurtada no repositório."""
    from src.domain.models import ShortUrl

    short = ShortUrl(short_code="abc1234", original_url="https://exemplo.com")
    await memory_repo.save(short)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac, "abc1234"


# ---------------------------------------------------------------------------
# Cenário A: Requests bem-sucedidos — result="success", exatamente 1 log
# ---------------------------------------------------------------------------


class TestCenarioA:
    """Request bem-sucedido em cada endpoint: 1 log com result=success."""

    async def test_post_urls_sucesso(self, client: AsyncClient, caplog: pytest.LogCaptureFixture) -> None:
        """POST /urls com URL válida → 201 + 1 log de sucesso."""
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            response = await client.post("/urls", json={"url": "https://exemplo.com/pagina"})

        assert response.status_code == 201
        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1, f"Esperado 1 log, obteve {len(logs)}"
        extras = _parse_extras(logs[0])
        assert extras["result"] == "success"
        assert extras["status_code"] == 201
        assert extras["method"] == "POST"
        assert extras["route"] == "/urls"
        assert extras["duration_ms"] is not None
        assert extras["timestamp"] is not None

    async def test_get_short_code_redirect_sucesso(
        self,
        seeded_client: tuple[AsyncClient, str],
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """GET /{short_code} com código existente → 302 + 1 log de sucesso."""
        ac, short_code = seeded_client
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            response = await ac.get(f"/{short_code}", follow_redirects=False)

        assert response.status_code == 302
        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        extras = _parse_extras(logs[0])
        assert extras["result"] == "success"
        assert extras["status_code"] == 302

    async def test_get_stats_sucesso(
        self,
        seeded_client: tuple[AsyncClient, str],
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """GET /urls/{short_code}/stats com código existente → 200 + 1 log de sucesso."""
        ac, short_code = seeded_client
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            response = await ac.get(f"/urls/{short_code}/stats")

        assert response.status_code == 200
        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        extras = _parse_extras(logs[0])
        assert extras["result"] == "success"
        assert extras["status_code"] == 200


# ---------------------------------------------------------------------------
# Cenário B: Falhas de negócio — result="failure", exatamente 1 log
# ---------------------------------------------------------------------------


class TestCenarioB:
    """Falha de negócio → 1 log com result=failure."""

    async def test_post_urls_url_invalida(self, client: AsyncClient, caplog: pytest.LogCaptureFixture) -> None:
        """POST /urls com URL inválida → 4xx + 1 log de falha."""
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            response = await client.post("/urls", json={"url": "nao-e-uma-url"})

        assert response.status_code >= 400
        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        extras = _parse_extras(logs[0])
        assert extras["result"] == "failure"
        assert extras["status_code"] >= 400

    async def test_get_short_code_inexistente(self, client: AsyncClient, caplog: pytest.LogCaptureFixture) -> None:
        """GET /{short_code} com código inexistente → 404 + 1 log de falha."""
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            response = await client.get("/codigoInexistente", follow_redirects=False)

        assert response.status_code == 404
        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        extras = _parse_extras(logs[0])
        assert extras["result"] == "failure"
        assert extras["status_code"] == 404

    async def test_get_stats_codigo_inexistente(self, client: AsyncClient, caplog: pytest.LogCaptureFixture) -> None:
        """GET /urls/{short_code}/stats com código inexistente → 404 + 1 log de falha."""
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            response = await client.get("/urls/codigoInexistente/stats")

        assert response.status_code == 404
        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        extras = _parse_extras(logs[0])
        assert extras["result"] == "failure"
        assert extras["status_code"] == 404


# ---------------------------------------------------------------------------
# Cenário C: Exceção não tratada — 1 log de falha, exceção propagada
# ---------------------------------------------------------------------------


class TestCenarioC:
    """Exceção não tratada: 1 log de falha + exceção propagada."""

    async def test_excecao_nao_tratada_emite_log_e_propaga(
        self,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """Endpoint que lança exceção: middleware loga falha e re-lança."""
        boom_app = FastAPI()
        boom_app.add_middleware(LoggingMiddleware)

        @boom_app.get("/boom")
        async def boom() -> JSONResponse:
            raise RuntimeError("explosão de teste")

        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            async with AsyncClient(
                transport=ASGITransport(app=boom_app),
                base_url="http://test",
            ) as ac:
                # O ASGI transport vai propagar a exceção como ServerError
                with pytest.raises(Exception):  # noqa: B017
                    await ac.get("/boom")

        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1, f"Esperado exatamente 1 log, obteve {len(logs)}"
        extras = _parse_extras(logs[0])
        assert extras["result"] == "failure"
        assert extras["status_code"] == 500

    async def test_excecao_nao_tratada_result_failure(
        self,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """Verifica que result=failure é emitido mesmo com exceção bruta."""
        boom_app = FastAPI()
        boom_app.add_middleware(LoggingMiddleware)

        @boom_app.get("/erro")
        async def erro() -> JSONResponse:
            raise ValueError("valor inválido inesperado")

        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            async with AsyncClient(
                transport=ASGITransport(app=boom_app),
                base_url="http://test",
            ) as ac:
                with pytest.raises(Exception):  # noqa: B017
                    await ac.get("/erro")

        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        extras = _parse_extras(logs[0])
        assert extras["result"] == "failure"


# ---------------------------------------------------------------------------
# Cenário D: Unicidade — exatamente 1 log por request
# ---------------------------------------------------------------------------


class TestCenarioD:
    """Para qualquer request, a contagem de logs do middleware é exatamente 1."""

    async def test_post_urls_emite_exatamente_1_log(
        self,
        client: AsyncClient,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            await client.post("/urls", json={"url": "https://unicidade.com"})

        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1

    async def test_get_url_inexistente_emite_exatamente_1_log(
        self,
        client: AsyncClient,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            await client.get("/xxx", follow_redirects=False)

        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1

    async def test_multiplos_requests_emitem_1_log_cada(
        self,
        client: AsyncClient,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """3 requests sequenciais → 3 logs, 1 por request."""
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            await client.post("/urls", json={"url": "https://a.com"})
            await client.post("/urls", json={"url": "https://b.com"})
            await client.post("/urls", json={"url": "https://c.com"})

        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 3


# ---------------------------------------------------------------------------
# Testes complementares — campos obrigatórios no log
# ---------------------------------------------------------------------------


class TestCamposObrigatorios:
    """Verifica que todos os campos mínimos estão presentes no log."""

    async def test_campos_minimos_presentes(
        self,
        client: AsyncClient,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """Todos os 6 campos obrigatórios devem estar presentes no LogRecord."""
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            await client.post("/urls", json={"url": "https://campos.com"})

        logs = _count_middleware_logs(caplog.records)
        assert len(logs) == 1
        record = logs[0]

        required_fields = ["timestamp", "method", "route", "status_code", "result", "duration_ms"]
        for field in required_fields:
            assert hasattr(record, field), f"Campo obrigatório ausente: {field!r}"
            assert getattr(record, field) is not None, f"Campo {field!r} é None"

    async def test_corpo_nao_logado(
        self,
        client: AsyncClient,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """O corpo da requisição NÃO deve aparecer nos logs."""
        sensitive_url = "https://senha-secreta.com/path?token=abc123"
        with caplog.at_level(logging.INFO, logger=middleware_logger.name):
            await client.post("/urls", json={"url": sensitive_url})

        for record in _count_middleware_logs(caplog.records):
            msg = record.getMessage()
            assert "senha-secreta" not in msg
            assert "token=abc123" not in msg


# ---------------------------------------------------------------------------
# Testes do JsonFormatter
# ---------------------------------------------------------------------------


class TestJsonFormatter:
    """Testes do JsonFormatter standalone."""

    def test_formato_json_valido(self) -> None:
        """JsonFormatter deve produzir JSON válido."""
        from src.infrastructure.logging.json_formatter import JsonFormatter

        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="mensagem de teste",
            args=(),
            exc_info=None,
        )
        output = formatter.format(record)
        parsed = json.loads(output)

        assert "timestamp" in parsed
        assert "level" in parsed
        assert "logger" in parsed
        assert "message" in parsed
        assert parsed["level"] == "INFO"
        assert parsed["logger"] == "test.logger"
        assert parsed["message"] == "mensagem de teste"

    def test_extras_incluidos_no_json(self) -> None:
        """Campos extras passados via extra={} devem aparecer no JSON."""
        from src.infrastructure.logging.json_formatter import JsonFormatter

        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="test",
            args=(),
            exc_info=None,
        )
        record.status_code = 200
        record.result = "success"

        output = formatter.format(record)
        parsed = json.loads(output)

        assert parsed.get("status_code") == 200
        assert parsed.get("result") == "success"

    def test_timestamp_utc_iso8601(self) -> None:
        """O timestamp deve estar em formato ISO 8601 UTC."""
        import re

        from src.infrastructure.logging.json_formatter import JsonFormatter

        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="test",
            args=(),
            exc_info=None,
        )
        output = formatter.format(record)
        parsed = json.loads(output)

        # ISO 8601 UTC: 2024-01-01T12:00:00+00:00 ou similar
        iso_pattern = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")
        assert iso_pattern.search(parsed["timestamp"]), f"Timestamp inválido: {parsed['timestamp']}"


# ---------------------------------------------------------------------------
# Testes do setup_logging
# ---------------------------------------------------------------------------


class TestSetupLogging:
    """Testes da função setup_logging."""

    def test_setup_configura_handler(self) -> None:
        """setup_logging deve adicionar pelo menos 1 handler ao root logger."""
        import src.infrastructure.logging.setup as setup_mod

        # Reset para testar
        original = setup_mod._CONFIGURED
        setup_mod._CONFIGURED = False

        try:
            root = logging.getLogger()
            original_handlers = root.handlers[:]
            root.handlers.clear()

            from src.infrastructure.logging.setup import setup_logging

            setup_logging()

            assert len(root.handlers) >= 1
            assert root.level == logging.INFO
        finally:
            root.handlers = original_handlers
            setup_mod._CONFIGURED = original

    def test_setup_idempotente(self) -> None:
        """Chamar setup_logging duas vezes não duplica handlers."""
        import src.infrastructure.logging.setup as setup_mod

        original = setup_mod._CONFIGURED
        setup_mod._CONFIGURED = False

        try:
            root = logging.getLogger()
            original_handlers = root.handlers[:]
            root.handlers.clear()

            from src.infrastructure.logging.setup import setup_logging

            setup_logging()
            count_after_first = len(root.handlers)
            setup_logging()
            count_after_second = len(root.handlers)

            assert count_after_first == count_after_second
        finally:
            root.handlers = original_handlers
            setup_mod._CONFIGURED = original
