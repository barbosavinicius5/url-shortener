"""Modelos de eventos de analytics."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class EventoLinkAcessado:
    """Evento disparado quando um codigo valido e acessado e gera redirecionamento."""

    codigo: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    referrer: Optional[str] = None
    user_agent: Optional[str] = None

    tipo_evento: str = field(init=False, default="link_acessado")


@dataclass
class EventoLinkNaoEncontrado:
    """Evento disparado quando um codigo inexistente e acessado."""

    codigo: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    tipo_evento: str = field(init=False, default="link_nao_encontrado")
