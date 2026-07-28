import logging
from dataclasses import dataclass
from typing import Optional

from url_shortener.domain.entities import Link
from url_shortener.domain.ports import AbstractLinkReadRepository

logger = logging.getLogger(__name__)


@dataclass
class ResolveResult:
    link: Optional[Link]
    found: bool


class ResolveShortCodeUseCase:
    def __init__(self, repo: AbstractLinkReadRepository) -> None:
        self._repo = repo

    async def execute(self, short_code: str) -> ResolveResult:
        link = await self._repo.get_by_short_code(short_code)
        found = link is not None
        status = 301 if (found and link.is_permanent) else (302 if found else 404)
        logger.info(
            "redirect_resolve",
            extra={"short_code": short_code, "found": found, "status_http": status},
        )
        return ResolveResult(link=link, found=found)
