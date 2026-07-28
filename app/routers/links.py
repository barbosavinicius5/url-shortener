from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import LinkCliquesResponse
from app.services import link_service

router = APIRouter(prefix="/links", tags=["links"])


@router.get("/{codigo_curto}/cliques", response_model=LinkCliquesResponse)
def consulta_cliques(codigo_curto: str, db: Session = Depends(get_db)):
    return link_service.get_total_cliques(codigo_curto, db)