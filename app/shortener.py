"""Lógica de geração de código curto com tratamento de colisões."""

import uuid

from sqlalchemy.orm import Session

from app.models import UrlCurta

# Alfabeto base62
_BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
_CODE_LEN = 7
_MAX_TENTATIVAS = 5


def _uuid_para_base62(length: int) -> str:
    """Gera uma string base62 de `length` caracteres a partir de um UUID4."""
    numero = uuid.uuid4().int
    chars = []
    base = len(_BASE62)
    while len(chars) < length:
        chars.append(_BASE62[numero % base])
        numero //= base
    return "".join(reversed(chars))


def gerar_codigo_unico(db: Session) -> str:
    """Gera um código curto único, com retry em caso de colisão (até 5x)."""
    for _ in range(_MAX_TENTATIVAS):
        codigo = _uuid_para_base62(_CODE_LEN)
        existe = db.get(UrlCurta, codigo)
        if existe is None:
            return codigo
    raise RuntimeError(
        "Não foi possível gerar um código único após várias tentativas."
    )