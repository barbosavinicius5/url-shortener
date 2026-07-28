"""Mecanismo de analytics para emissão de eventos de domínio."""

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def emitir_evento(nome: str, propriedades: dict[str, Any]) -> None:
    """Emite um evento de analytics.

    Registra o evento no logger e pode ser estendido para integrar
    com serviços externos (Amplitude, Segment, etc.).

    Args:
        nome: Nome do evento (ex.: ``"url_encurtada"``).
        propriedades: Dicionário de propriedades associadas ao evento.
    """
    logger.info("analytics event=%s props=%s", nome, propriedades)