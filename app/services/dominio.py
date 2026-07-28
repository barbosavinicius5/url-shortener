"""
Stub do serviço de domínio (t002).
Gera um codigo_curto aleatório e retorna os dados sem persistência em banco.
"""
import secrets
import string
from datetime import datetime, timezone


_ALFABETO = string.ascii_letters + string.digits  # base62


def _gerar_codigo(tamanho: int = 6) -> str:
    return "".join(secrets.choice(_ALFABETO) for _ in range(tamanho))


def criar_encurtamento(url_original: str) -> dict:
    """Cria um encurtamento in-memory e retorna o resultado."""
    codigo_curto = _gerar_codigo()
    criado_em = datetime.now(timezone.utc).isoformat()
    return {
        "codigo_curto": codigo_curto,
        "url_original": url_original,
        "criado_em": criado_em,
    }
