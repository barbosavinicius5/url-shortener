from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import link_repository
from app.schemas import LinkCliquesResponse


def get_total_cliques(codigo_curto: str, db: Session) -> LinkCliquesResponse:
    link = link_repository.get_by_codigo_curto(db, codigo_curto)
    if link is None:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    return LinkCliquesResponse(
        codigo_curto=link.codigo_curto,
        total_cliques=link.total_cliques,
    )