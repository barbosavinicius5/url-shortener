from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.events import emit_event
from app.models import Link
from app.schemas import ShortenRequest, ShortenResponse
from app.service import create_short_code, validate_url

router = APIRouter()


@router.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten_url(request: ShortenRequest, db: Session = Depends(get_db)):
    is_valid, motivo = validate_url(request.url)
    if not is_valid:
        emit_event("url_rejeitada", {"motivo": motivo})
        raise HTTPException(
            status_code=422,
            detail={"erro": "validacao", "motivo": motivo},
        )

    codigo = create_short_code(db)
    link = Link(codigo=codigo, url_original=request.url)
    db.add(link)
    db.commit()
    db.refresh(link)

    emit_event("link_encurtado", {"codigo": codigo, "url_original": request.url})

    return ShortenResponse(
        codigo=codigo,
        url_original=request.url,
        url_curta=f"http://localhost/{codigo}",
    )