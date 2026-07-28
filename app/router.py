from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.analytics import registrar_evento
from app.database import get_db
from app.events import emit_event
from app.models import Link
from app.schemas import ShortenRequest, ShortenResponse
from app.service import create_short_code, validate_url

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers de analytics — eventos originais da t001 (preservados)
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
# Helpers de analytics — eventos da t002 (url_redirecionada / redirecionamento_nao_encontrado)
# ---------------------------------------------------------------------------

def _emitir_url_redirecionada(codigo: str, referrer: str | None) -> None:
    """Emite evento url_redirecionada conforme contrato da t002."""
    evento: dict = {
        "evento": "url_redirecionada",
        "codigo": codigo,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "referrer": referrer,
    }
    registrar_evento(evento)


def _emitir_redirecionamento_nao_encontrado(codigo: str) -> None:
    """Emite evento redirecionamento_nao_encontrado conforme contrato da t002."""
    evento: dict = {
        "evento": "redirecionamento_nao_encontrado",
        "codigo": codigo,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        registrar_evento(evento)
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
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Redireciona para a URL original associada ao codigo curto.

    - HTTP 302 + Location se o codigo existir; incrementa ``cliques`` e
      ``total_cliques`` atomicamente.
    - HTTP 404 se o codigo nao existir.
    - Sem autenticacao (rota publica).
    - Eventos de analytics emitidos: ``codigo_acessado`` (t001) e
      ``url_redirecionada`` (t002) no sucesso; ``codigo_nao_encontrado`` (t001)
      e ``redirecionamento_nao_encontrado`` (t002) no 404.
    """
    link = db.query(Link).filter(Link.codigo == codigo).first()

    if link is None:
        # BackgroundTasks nao disparam com HTTPException; registramos antes do raise.
        _emitir_codigo_nao_encontrado(codigo)
        _emitir_redirecionamento_nao_encontrado(codigo)
        raise HTTPException(status_code=404, detail="link nao encontrado")

    # Incremento atomico: operacao unica no banco, sem race condition.
    # Atualiza tanto ``cliques`` (t001) quanto ``total_cliques`` (t002).
    db.execute(
        update(Link)
        .where(Link.codigo == codigo)
        .values(
            cliques=Link.cliques + 1,
            total_cliques=Link.total_cliques + 1,
        )
    )
    db.commit()

    # Captura o referrer antes de despachar a resposta.
    referrer: str | None = request.headers.get("referer") or request.headers.get("referrer") or None

    # Analytics nao-bloqueante: resposta 302 sai imediatamente.
    background_tasks.add_task(_emitir_codigo_acessado, codigo)
    # Evento t002 — emitido em background para nao atrasar o redirect.
    background_tasks.add_task(_emitir_url_redirecionada, codigo, referrer)

    return RedirectResponse(url=link.url_original, status_code=302)