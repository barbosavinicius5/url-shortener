"""Application use-cases."""

import json
import logging
import re
from datetime import UTC, datetime
from typing import Any

from url_shortener.application.ports import UrlRepositoryPort
from url_shortener.domain.exceptions import InvalidShortCodeFormatError, ShortUrlNotFoundError

_SHORT_CODE_RE = re.compile(r"^[0-9A-Za-z]{1,20}$")

logger = logging.getLogger("url_shortener.stats")


def _audit_log(short_code: str, result: str, **kwargs: Any) -> None:
    record: dict[str, Any] = {
        "short_code": short_code,
        "result": result,
        "timestamp": datetime.now(UTC).isoformat(),
        **kwargs,
    }
    logger.info(json.dumps(record))


class GetUrlStatsUseCase:
    """Return click statistics for a short URL."""

    def __init__(self, repository: UrlRepositoryPort) -> None:
        self._repo = repository

    async def execute(self, short_code: str) -> dict[str, Any]:
        """
        Execute the use-case.

        1. Validate Base62 format.
        2. Fetch from repository.
        3. Raise domain exception when not found.
        4. Return stats dict.
        """
        # Step 1 — format validation (no repository call on invalid format)
        if not _SHORT_CODE_RE.match(short_code):
            _audit_log(short_code, "invalid_format")
            raise InvalidShortCodeFormatError(short_code)

        # Step 2 — fetch
        entity = await self._repo.get_by_short_code(short_code)

        # Step 3 — not found
        if entity is None:
            _audit_log(short_code, "not_found")
            raise ShortUrlNotFoundError(short_code)

        # Step 4 — return stats
        _audit_log(short_code, "found", total_clicks=entity.click_count)
        return {"short_code": entity.short_code, "total_clicks": entity.click_count}
