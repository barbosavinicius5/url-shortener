"""Modelos de domínio do Encurtador de URL v3."""

from dataclasses import dataclass, field


@dataclass
class UrlEncurtada:
    """Representa uma URL encurtada e suas métricas."""

    codigo_curto: str
    url_original: str
    cliques: int = 0