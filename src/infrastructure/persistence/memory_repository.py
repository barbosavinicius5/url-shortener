"""Repositório em memória — usado em testes e desenvolvimento local sem banco."""

from src.domain.models import ShortUrl
from src.domain.ports import UrlRepository


class InMemoryUrlRepository(UrlRepository):
    """Adaptador de repositório que mantém os dados em um dict em memória."""

    def __init__(self) -> None:
        self._store: dict[str, ShortUrl] = {}

    async def save(self, short_url: ShortUrl) -> ShortUrl:
        self._store[short_url.short_code] = short_url
        return short_url

    async def find_by_code(self, short_code: str) -> ShortUrl | None:
        return self._store.get(short_code)

    async def increment_clicks(self, short_code: str) -> None:
        if short_code in self._store:
            self._store[short_code].click_count += 1
