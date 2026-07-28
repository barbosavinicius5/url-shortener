from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.database import get_db
from app.events import emit_event
from app.models import Link
from app.schemas import ShortenRequest, ShortenResponse
from app.service import create_short_code, validate_url

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers de analytics
# ---------------------------------------------------------------------------


def _emitir_codigo_acessado(codigo_curto: str) -> None:
    """Emite evento codigo_acessado (chamado via BackgroundTask — nao bloqueante)."""
    emit_event(
        "codigo_acessado",
        {
            "codigo_curto": codigo_curto,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


def _emitir_codigo_nao_encontrado(codigo_curto: str) -> None:
    """Emite evento codigo_nao_encontrado (suprime excecoes para nao afetar a resposta)."""
    try:
        emit_event(
            "codigo_nao_encontrado",
            {
                "codigo_curto": codigo_curto,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


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


@router.get("/{codigo}", status_code=302)
def redirect_codigo(
    codigo: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Redireciona para a URL original associada ao codigo curto.

    - HTTP 302 + Location se o codigo existir; incrementa ``cliques`` atomicamente.
    - HTTP 404 se o codigo nao existir.
    - Sem autenticacao (rota publica).
    - Evento de analytics emitido via BackgroundTask (nao bloqueia o redirect).
    """
    link = db.query(Link).filter(Link.codigo == codigo).first()

    if link is None:
        # BackgroundTasks nao disparam com HTTPException; registramos antes do raise.
        _emitir_codigo_nao_encontrado(codigo)
        raise HTTPException(status_code=404, detail="link nao encontrado")

    # Incremento atomico: operacao unica no banco, sem race condition.
    db.execute(
        update(Link).where(Link.codigo == codigo).values(cliques=Link.cliques + 1)
    )
    db.commit()

    # Analytics nao-bloqueante: resposta 302 sai imediatamente.
    background_tasks.add_task(_emitir_codigo_acessado, codigo)

    return RedirectResponse(url=link.url_original, status_code=302)
