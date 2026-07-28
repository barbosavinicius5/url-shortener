import random
import string
from datetime import datetime

from app.models import Link

_BASE62 = string.ascii_letters + string.digits  # a-z A-Z 0-9 → 62 chars
_CODIGO_LENGTH = 6


def _gerar_codigo_curto() -> str:
    """Gera um código aleatório de 6 caracteres base62."""
    return "".join(random.choices(_BASE62, k=_CODIGO_LENGTH))


def criar_encurtamento(url_original: str, repo, analytics) -> Link:
    """Cria um encurtamento de URL garantindo unicidade do codigo_curto.

    Args:
        url_original: A URL a ser encurtada.
        repo: Repositório de Links (deve implementar get_by_codigo_curto e save).
        analytics: Serviço de analytics (deve implementar emit).

    Returns:
        O objeto Link persistido.
    """
    # Gera código único — loop de detecção de colisão
    codigo_curto = _gerar_codigo_curto()
    while repo.get_by_codigo_curto(codigo_curto) is not None:
        codigo_curto = _gerar_codigo_curto()

    criado_em = datetime.utcnow()

    link = Link(
        codigo_curto=codigo_curto,
        url_original=url_original,
        total_cliques=0,
        criado_em=criado_em,
    )

    link = repo.save(link)

    analytics.emit(
        "url_encurtada",
        {
            "codigo_curto": link.codigo_curto,
            "url_original": link.url_original,
            "criado_em": link.criado_em,
        },
    )

    return link