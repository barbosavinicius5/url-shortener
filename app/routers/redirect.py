from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Link

router = APIRouter()


@router.get("/{codigo}")
def redirect(codigo: str, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.codigo == codigo).first()
    if link is None:
        raise HTTPException(status_code=404, detail="não encontrado")

    db.execute(
        update(Link)
        .where(Link.codigo == codigo)
        .values(total_cliques=Link.total_cliques + 1)
    )
    db.commit()

    return RedirectResponse(url=link.url_original, status_code=302)