from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Link

router = APIRouter()


@router.get("/{codigo}")
def redirecionar(codigo: str, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.codigo == codigo).first()
    if link is None:
        return JSONResponse({"detail": "não encontrado"}, status_code=404)
    return RedirectResponse(url=link.url_original, status_code=302)