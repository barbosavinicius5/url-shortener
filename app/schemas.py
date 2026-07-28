from pydantic import BaseModel


class LinkCliquesResponse(BaseModel):
    codigo_curto: str
    total_cliques: int