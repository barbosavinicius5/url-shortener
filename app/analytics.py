"""Camada de analytics da t002.

Expõe ``registrar_evento(evento: dict)`` que persiste eventos em lista
em memória (testável via spy/patch) e também os loga como JSON no stdout.
"""

import json
import logging

logger = logging.getLogger(__name__)

# Armazenamento em memória — permite captura nos testes via get_eventos().
_eventos: list[dict] = []


def registrar_evento(evento: dict) -> None:
    """Persiste e loga o evento de analytics.

    Testável: use ``unittest.mock.patch('app.analytics.registrar_evento', ...)``
    ou consulte ``get_eventos()`` diretamente para inspecionar as emissões.
    """
    _eventos.append(evento)
    logger.info(json.dumps(evento, ensure_ascii=False))


def get_eventos() -> list[dict]:
    """Retorna cópia da lista de eventos registrados (uso em testes)."""
    return list(_eventos)


def limpar_eventos() -> None:
    """Limpa todos os eventos registrados (uso em testes)."""
    _eventos.clear()