import os
import secrets
import string
from urllib.parse import urlparse

from app.repositories import url_repository
from app.events import analytics

BASE_URL = os.environ.get("BASE_URL", "http://localhost")

_ALPHABET = string.ascii_letters + string.digits  # base62: A-Za-z0-9
_CODE_LENGTH = 6


class InvalidURLError(ValueError):
    """Levantado quando a URL não passa na validação."""
    pass


def _validate_url(url: str) -> None:
    """Valida esquema e estrutura da URL. Levanta InvalidURLError se inválida."""
    try:
        parsed = urlparse(url)
    except Exception:
        raise InvalidURLError("URL inválida ou esquema não suportado (apenas http/https)")

    if parsed.scheme not in ("http", "https"):
        raise InvalidURLError("URL inválida ou esquema não suportado (apenas http/https)")

    if not parsed.netloc:
        raise InvalidURLError("URL inválida ou esquema não suportado (apenas http/https)")


def _generate_code(length: int = _CODE_LENGTH) -> str:
    """Gera um código alfanumérico único de `length` caracteres."""
    while True:
        code = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        if not url_repository.exists(code):
            return code


def shorten(url_original: str) -> dict:
    """
    Valida, gera o código único, persiste e emite eventos.
    Retorna dict com 'codigo', 'url_encurtada' e 'url_original'.
    Levanta InvalidURLError em caso de URL inválida.
    """
    try:
        _validate_url(url_original)
    except InvalidURLError as exc:
        analytics.emit_url_invalida_rejeitada(motivo=str(exc))
        raise

    codigo = _generate_code()
    url_repository.save(codigo, url_original)
    url_encurtada = f"{BASE_URL}/{codigo}"

    analytics.emit_url_encurtada(codigo=codigo, url_original=url_original)

    return {
        "codigo": codigo,
        "url_encurtada": url_encurtada,
        "url_original": url_original,
    }