from pydantic import BaseModel


class ShortenRequest(BaseModel):
    url_original: str


class ShortenResponse(BaseModel):
    codigo: str
    url_encurtada: str
    url_original: str


class ErrorResponse(BaseModel):
    erro: bool
    motivo: str