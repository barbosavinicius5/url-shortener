"""Repositório em memória para URLs encurtadas."""

from app.models import UrlEncurtada


class RepositorioUrls:
    """Armazena e recupera URLs encurtadas em memória."""

    def __init__(self) -> None:
        self._store: dict[str, UrlEncurtada] = {}

    def salvar(self, url: UrlEncurtada) -> None:
        self._store[url.codigo_curto] = url

    def buscar(self, codigo_curto: str) -> UrlEncurtada | None:
        return self._store.get(codigo_curto)

    def incrementar_cliques(self, codigo_curto: str) -> UrlEncurtada | None:
        url = self._store.get(codigo_curto)
        if url is None:
            return None
        url.cliques += 1
        return url

    def listar(self) -> list[UrlEncurtada]:
        return list(self._store.values())


# Instância global compartilhada pela aplicação
repositorio = RepositorioUrls()