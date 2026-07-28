from pydantic import BaseModel, field_validator
from urllib.parse import urlparse


class EncurtamentoRequest(BaseModel):
    url_original: str

    @field_validator("url_original")
    @classmethod
    def validar_url(cls, v: str) -> str:
        if not v:
            raise ValueError("URL inválida: apenas esquemas http e https são permitidos.")
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("URL inválida: apenas esquemas http e https são permitidos.")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("URL inválida: apenas esquemas http e https são permitidos.")
        if not parsed.netloc:
            raise ValueError("URL inválida: apenas esquemas http e https são permitidos.")
        return v


class EncurtamentoResponse(BaseModel):
    codigo_curto: str
    url_original: str
    link_encurtado: str


class ErroResponse(BaseModel):
    detail: str
