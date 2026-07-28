from pydantic import BaseModel


class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    codigo: str
    url_encurtada: str


class StatsResponse(BaseModel):
    codigo: str
    total_cliques: int