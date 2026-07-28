from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_api_key
from app.database import get_db
from app.models import Link
from app.schemas import StatsResponse

router = APIRouter()


@router.get("/stats/{codigo}", response_model=StatsResponse)
def get_stats(
    codigo: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key),
):
    link = db.query(Link).filter(Link.codigo == codigo).first()
    if link is None:
        raise HTTPException(status_code=404, detail="não encontrado")
    return StatsResponse(codigo=link.codigo, total_cliques=link.total_cliques)