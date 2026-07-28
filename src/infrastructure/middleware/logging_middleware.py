"""Middleware ASGI de logging estruturado JSON por requisição."""

import contextlib
import logging
import time
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

_SUCCESS_THRESHOLD = 400


class LoggingMiddleware(BaseHTTPMiddleware):
    """Emite exatamente 1 linha de log JSON por requisição via stdlib ``logging``.

    Campos emitidos:
    - ``timestamp``: ISO 8601 UTC do início da requisição.
    - ``method``: método HTTP (GET, POST, …).
    - ``route``: path da requisição.
    - ``status_code``: código HTTP da resposta.
    - ``result``: ``"success"`` se status < 400, ``"failure"`` se status >= 400.
    - ``duration_ms``: tempo de processamento em ms (float).

    Garante que:
    - Corpo da requisição/resposta **não** é logado (sem vazamento de dados sensíveis).
    - Uma falha no handler de logging **não** derruba o request.
    - Exceções não tratadas são capturadas, logadas como falha (5xx) e re-lançadas.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start = time.perf_counter()
        timestamp = datetime.now(UTC).isoformat()
        method = request.method
        route = request.url.path

        status_code = 500
        exc_to_raise: BaseException | None = None

        try:
            response: Response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:  # noqa: BLE001
            status_code = 500
            exc_to_raise = exc

        duration_ms = (time.perf_counter() - start) * 1000.0
        result = "success" if status_code < _SUCCESS_THRESHOLD else "failure"

        with contextlib.suppress(Exception):
            logger.info(
                "%s %s %d",
                method,
                route,
                status_code,
                extra={
                    "timestamp": timestamp,
                    "method": method,
                    "route": route,
                    "status_code": status_code,
                    "result": result,
                    "duration_ms": round(duration_ms, 3),
                },
            )

        if exc_to_raise is not None:
            raise exc_to_raise

        return response
