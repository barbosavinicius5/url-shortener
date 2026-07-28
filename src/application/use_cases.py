"""Casos de uso da aplicação (camada Application)."""

import re
import secrets
import string

from src.domain.exceptions import InvalidUrlError, ShortCodeNotFoundError
from src.domain.models import ShortUrl
from src.domain.ports import UrlRepository

_URL_PATTERN = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)
_BASE62_CHARS = string.ascii_letters + string.digits
_CODE_LENGTH = 7


def _is_valid_url(url: str) -> bool:
    return bool(_URL_PATTERN.match(url))


def _generate_code() -> str:
    return "".join(secrets.choice(_BASE62_CHARS) for _ in range(_CODE_LENGTH))


class ShortenUrlUseCase:
    """Encurta uma URL e persiste o mapeamento."""

    def __init__(self, repository: UrlRepository) -> None:
        self._repo = repository

    async def execute(self, original_url: str) -> ShortUrl:
        if not _is_valid_url(original_url):
            raise InvalidUrlError(original_url)

        short_code = _generate_code()
        short_url = ShortUrl(short_code=short_code, original_url=original_url)
        return await self._repo.save(short_url)


class ResolveUrlUseCase:
    """Resolve um código curto para a URL original e registra o clique."""

    def __init__(self, repository: UrlRepository) -> None:
        self._repo = repository

    async def execute(self, short_code: str) -> ShortUrl:
        short_url = await self._repo.find_by_code(short_code)
        if short_url is None:
            raise ShortCodeNotFoundError(short_code)
        await self._repo.increment_clicks(short_code)
        return short_url


class GetStatsUseCase:
    """Retorna as estatísticas de um código curto."""

    def __init__(self, repository: UrlRepository) -> None:
        self._repo = repository

    async def execute(self, short_code: str) -> ShortUrl:
        short_url = await self._repo.find_by_code(short_code)
        if short_url is None:
            raise ShortCodeNotFoundError(short_code)
        return short_url
