from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import events
from app.database import get_db
from app.models import Link

router = APIRouter()


def _emit_redirecionado(codigo_curto: str) -> None:
    events.emit(
        "link_redirecionado",
        {
            "codigo_curto": codigo_curto,
            "redirecionado_em": datetime.now(tz=timezone.utc).isoformat(),
        },
    )


def _emit_inexistente(codigo_curto: str) -> None:
    events.emit(
        "codigo_inexistente_acessado",
        {
            "codigo_curto": codigo_curto,
            "acessado_em": datetime.now(tz=timezone.utc).isoformat(),
        },
    )


@router.get("/{codigo_curto}")
def redirect_url(
    codigo_curto: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    link = db.query(Link).filter(Link.codigo_curto == codigo_curto).first()

    if link is None:
        # Emite evento imediatamente (antes da exceção encerrar o fluxo)
        # BackgroundTask não é executado quando HTTPException é levantada
        _emit_inexistente(codigo_curto)
        raise HTTPException(status_code=404, detail="link não encontrado")

    # Incremento atômico via SQL UPDATE
    db.execute(
        text(
            "UPDATE links SET total_cliques = total_cliques + 1 "
            "WHERE codigo_curto = :codigo_curto"
        ),
        {"codigo_curto": codigo_curto},
    )
    db.commit()

    # BackgroundTask não bloqueia o redirecionamento (executa após a resposta ser enviada)
    background_tasks.add_task(_emit_redirecionado, codigo_curto)

    return RedirectResponse(url=link.url_original, status_code=307)
