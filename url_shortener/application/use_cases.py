"""Application layer: use-case orchestration.

Depends on Domain + Port (abstract). Zero FastAPI / SQLAlchemy imports.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto
from uuid import UUID

from url_shortener.application.ports import UrlRepository
from url_shortener.domain.url import ShortUrl, _DEFAULT_PROJECT_ID, base62_encode, validate_long_url


class ShortenResultKind(Enum):
    CREATED = auto()
    EXISTING = auto()


@dataclass
class ShortenResult:
    short_url_entity: ShortUrl
    kind: ShortenResultKind

    @property
    def is_new(self) -> bool:
        return self.kind is ShortenResultKind.CREATED


async def shorten_url(
    long_url_raw: str,
    repository: UrlRepository,
    base_url: str,
    project_id: UUID = _DEFAULT_PROJECT_ID,
) -> ShortenResult:
    """Orchestrate the URL shortening use-case.

    Steps:
    1. Validate long_url (domain).
    2. Look up existing record by (project_id, long_url).
    3. If found, return existing (idempotence).
    4. Otherwise, insert pending record -> get id.
    5. Generate short_code = base62_encode(id).
    6. Persist short_code.
    7. Return newly created entity.
    """
    # Step 1 - validate
    long_url = validate_long_url(long_url_raw)

    # Step 2 - idempotence check
    existing = await repository.get_by_long_url(project_id, long_url)
    if existing is not None:
        return ShortenResult(short_url_entity=existing, kind=ShortenResultKind.EXISTING)

    # Step 3 - insert without short_code
    record_id = await repository.insert_pending(project_id, long_url)

    # Step 4 - generate deterministic short_code
    short_code = base62_encode(record_id)

    # Step 5 - persist short_code
    await repository.update_short_code(record_id, short_code)

    entity = ShortUrl.from_id(record_id=record_id, long_url=long_url, project_id=project_id)
    return ShortenResult(short_url_entity=entity, kind=ShortenResultKind.CREATED)
