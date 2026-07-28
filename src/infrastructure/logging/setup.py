"""Configuração de logging estruturado JSON para a aplicação."""

import logging
import sys

from src.infrastructure.logging.json_formatter import JsonFormatter

_CONFIGURED = False


def setup_logging(level: int = logging.INFO) -> None:
    """Configura o root logger com :class:`JsonFormatter`, nível INFO e StreamHandler para stdout.

    É seguro chamar múltiplas vezes — a configuração é aplicada somente uma vez.
    """
    global _CONFIGURED
    if _CONFIGURED:
        return

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(JsonFormatter())

    # Remove handlers existentes para evitar duplicação
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    _CONFIGURED = True
