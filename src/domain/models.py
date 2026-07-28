"""Modelos de domínio — apenas stdlib, sem dependências externas."""

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class ShortUrl:
    """Entidade de domínio representando uma URL encurtada."""

    short_code: str
    original_url: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    click_count: int = 0
