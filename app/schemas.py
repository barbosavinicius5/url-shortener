from pydantic import BaseModel


class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    codigo: str
    url_original: str
    url_curta: str


class ErrorResponse(BaseModel):
    erro: str
    motivo: str