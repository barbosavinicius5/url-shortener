import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth import get_api_key
from app.database import get_db
from app.models import Link
from app.schemas import ShortenRequest, ShortenResponse

router = APIRouter()


def _gerar_codigo(db: Session) -> str:
    """Gera código curto único de 6 caracteres (base62 via uuid)."""
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    while True:
        raw = uuid.uuid4().int
        codigo = ""
        for _ in range(6):
            raw, rem = divmod(raw, 62)
            codigo += chars[rem]
        existe = db.query(Link).filter(Link.codigo == codigo).first()
        if not existe:
            return codigo


@router.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten(
    body: ShortenRequest,
    request: Request,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    codigo = _gerar_codigo(db)
    link = Link(url_original=body.url, codigo=codigo)
    db.add(link)
    db.commit()
    db.refresh(link)

    base_url = str(request.base_url).rstrip("/")
    url_encurtada = f"{base_url}/{link.codigo}"
    return ShortenResponse(codigo=link.codigo, url_encurtada=url_encurtada)