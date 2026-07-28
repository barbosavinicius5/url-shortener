"""Router de métricas — expõe GET /metrics com o total acumulado de cliques."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Link

router = APIRouter()


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)) -> dict[str, int]:  # noqa: B008
    """Retorna a métrica ``clicks_total``: soma de todos os cliques persistidos no DB.

    A fonte de verdade é a coluna ``cliques`` da tabela ``links``.
    Nenhum contador em memória é mantido — isso evita dupla fonte de verdade e
    garante consistência mesmo após reinicializações do processo.
    """
    total: int = db.query(func.sum(Link.cliques)).scalar() or 0
    return {"clicks_total": total}
