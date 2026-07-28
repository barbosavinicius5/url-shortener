"""Schemas Pydantic (request / response) do Encurtador de URL v3."""

import re

from pydantic import BaseModel, Field, field_validator

# Padrão aceito: alfanumérico + hífen/underline, 1–32 caracteres
_PADRAO_CODIGO = re.compile(r"^[A-Za-z0-9_-]{1,32}$")


class UrlEncurtarRequest(BaseModel):
    url_original: str = Field(..., description="URL a ser encurtada")


class UrlEncurtadaResponse(BaseModel):
    codigo_curto: str
    url_original: str


class StatsResponse(BaseModel):
    codigo_curto: str
    cliques: int = Field(..., ge=0)


def validar_codigo_curto(codigo_curto: str) -> str:
    """Valida o código curto e levanta ValueError em caso de falha.

    Usado pelos routers para sanitizar a entrada antes de consultar
    o repositório.

    Args:
        codigo_curto: Valor bruto recebido na URL.

    Returns:
        O próprio código se válido.

    Raises:
        ValueError: Quando o código é vazio ou fora do padrão alfanumérico.
    """
    stripped = codigo_curto.strip()
    if not stripped:
        raise ValueError("O código curto não pode ser vazio.")
    if not _PADRAO_CODIGO.match(stripped):
        raise ValueError(
            "Código curto inválido: use apenas letras, números, hífen ou "
            "underline (máx. 32 caracteres)."
        )
    return stripped