import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Lista de eventos emitidos — acessível para asserções em testes
emitted_events: list[dict] = []


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def emit_url_encurtada(codigo: str, url_original: str) -> None:
    """Emite o evento de URL encurtada com sucesso."""
    try:
        event = {
            "event": "url_encurtada",
            "codigo": codigo,
            "url_original": url_original,
            "timestamp": _now_iso(),
        }
        emitted_events.append(event)
        logger.info("event=url_encurtada codigo=%s url_original=%s timestamp=%s",
                    codigo, url_original, event["timestamp"])
    except Exception:
        logger.exception("Falha ao emitir evento url_encurtada")


def emit_url_invalida_rejeitada(motivo: str) -> None:
    """Emite o evento de URL inválida rejeitada."""
    try:
        event = {
            "event": "url_invalida_rejeitada",
            "motivo": motivo,
            "timestamp": _now_iso(),
        }
        emitted_events.append(event)
        logger.warning("event=url_invalida_rejeitada motivo=%s timestamp=%s",
                       motivo, event["timestamp"])
    except Exception:
        logger.exception("Falha ao emitir evento url_invalida_rejeitada")


def clear_events() -> None:
    """Limpa a lista de eventos (útil para testes)."""
    emitted_events.clear()