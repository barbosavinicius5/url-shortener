"""Servico de analytics -- logica de negocio sobre o repositorio."""

import logging
from typing import Optional

from shortener.analytics.repository import AnalyticsRepository

logger = logging.getLogger(__name__)

# Instancia singleton usada pela aplicacao.
_repo = AnalyticsRepository()


class AnalyticsService:
    """Fachada de alto nivel para operacoes de analytics."""

    def __init__(self, repo: Optional[AnalyticsRepository] = None) -> None:
        self._repo = repo or _repo

    def registrar_link_acessado(
        self,
        codigo: str,
        referrer: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Registra evento link_acessado.

        Excecoes sao capturadas e logadas -- nunca propagadas ao chamador,
        garantindo que falhas de analytics nao afetem o fluxo principal.
        """
        try:
            self._repo.registrar_link_acessado(codigo, referrer=referrer, user_agent=user_agent)
        except Exception:
            logger.exception("Falha ao registrar evento link_acessado para codigo=%r", codigo)

    def registrar_link_nao_encontrado(self, codigo: str) -> None:
        """Registra evento link_nao_encontrado.

        Mesmo comportamento defensivo: excecoes sao suprimidas com log.
        """
        try:
            self._repo.registrar_link_nao_encontrado(codigo)
        except Exception:
            logger.exception(
                "Falha ao registrar evento link_nao_encontrado para codigo=%r", codigo
            )

    def contar_cliques(self, codigo: str) -> int:
        """Retorna COUNT de eventos link_acessado para codigo."""
        return self._repo.contar_cliques(codigo)


# Instancia padrao utilizada pela aplicacao.
analytics_service = AnalyticsService()
