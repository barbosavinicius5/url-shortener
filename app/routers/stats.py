"""Router: consulta de contagem de cliques por código curto."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.analytics import emitir_evento
from app.repositorio import repositorio
from app.schemas import StatsResponse, validar_codigo_curto

router = APIRouter(tags=["stats"])


@router.get("/{codigo_curto}/stats", response_model=StatsResponse)
def consultar_stats(codigo_curto: str) -> StatsResponse:
    """Retorna a contagem de cliques de um código curto.

    **Cenário A** — Código existente: resposta 200 com ``codigo_curto`` e
    ``cliques``.

    **Cenário B** — Código inexistente: HTTP 404 com mensagem clara.

    **Cenário C** — Código inválido (vazio ou fora do padrão): HTTP 422 com
    mensagem descritiva.

    **Cenário D** — ``cliques`` reflete os acessos reais registrados no
    repositório.

    **Cenário E** — Evento ``stats_consultado`` é emitido com
    ``codigo_curto`` e ``timestamp``.
    """
    # Cenário C — validação da entrada
    try:
        codigo_curto = validar_codigo_curto(codigo_curto)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Cenário B — código inexistente
    url = repositorio.buscar(codigo_curto)
    if url is None:
        raise HTTPException(status_code=404, detail="Código curto não encontrado")

    # Cenário E — analytics
    emitir_evento(
        "stats_consultado",
        {
            "codigo_curto": codigo_curto,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

    # Cenários A e D — resposta com cliques reais
    return StatsResponse(codigo_curto=url.codigo_curto, cliques=url.cliques)