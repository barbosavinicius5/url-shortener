"""Schemas Pydantic para validação de entrada e saída."""

from pydantic import AnyHttpUrl, BaseModel, field_validator


class ShortenRequest(BaseModel):
    url_destino: AnyHttpUrl

    @field_validator("url_destino", mode="before")
    @classmethod
    def url_nao_vazia(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip():
            raise ValueError("url_destino não pode ser vazia")
        return v


class ShortenResponse(BaseModel):
    codigo_curto: str
    url_curta: str