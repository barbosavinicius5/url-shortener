"""Formatter que serializa LogRecord para uma única linha JSON (stdlib only)."""

import json
import logging
from datetime import UTC, datetime
from typing import Any


class JsonFormatter(logging.Formatter):
    """Serializa cada :class:`logging.LogRecord` em uma única linha JSON.

    Campos fixos emitidos:
    - ``timestamp``: ISO 8601 UTC do momento em que o log foi criado.
    - ``level``: nome do nível (DEBUG, INFO, WARNING, ERROR, CRITICAL).
    - ``logger``: nome do logger que emitiu o registro.
    - ``message``: mensagem formatada.

    Quaisquer campos extras passados via ``extra={}`` são mesclados no JSON.
    """

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        """Retorna o registro serializado como JSON de uma linha."""
        # Timestamp em UTC ISO 8601
        created_at = datetime.fromtimestamp(record.created, tz=UTC)
        timestamp = created_at.isoformat()

        payload: dict[str, Any] = {
            "timestamp": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Campos extras adicionados via extra={...} no call site
        _reserved = {
            "name",
            "msg",
            "args",
            "levelname",
            "levelno",
            "pathname",
            "filename",
            "module",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "created",
            "msecs",
            "relativeCreated",
            "thread",
            "threadName",
            "processName",
            "process",
            "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in _reserved and not key.startswith("_"):
                payload[key] = value

        # Informações de exceção (se houver)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        elif record.exc_text:
            payload["exception"] = record.exc_text

        if record.stack_info:
            payload["stack_info"] = self.formatStack(record.stack_info)

        return json.dumps(payload, default=str, ensure_ascii=False)
