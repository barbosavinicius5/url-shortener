"""Portas (interfaces) do domínio — contratos abstratos."""

from abc import ABC, abstractmethod

from src.domain.models import ShortUrl


class UrlRepository(ABC):
    """Porta de repositório para URLs encurtadas."""

    @abstractmethod
    async def save(self, short_url: ShortUrl) -> ShortUrl:
        """Persiste uma URL encurtada e retorna a entidade persistida."""
        ...

    @abstractmethod
    async def find_by_code(self, short_code: str) -> ShortUrl | None:
        """Busca uma URL pelo código curto; retorna None se não encontrada."""
        ...

    @abstractmethod
    async def increment_clicks(self, short_code: str) -> None:
        """Incrementa o contador de cliques de um código curto."""
        ...
