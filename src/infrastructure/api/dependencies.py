"""Dependências FastAPI — fábrica de repositórios e casos de uso."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends

from src.application.use_cases import GetStatsUseCase, ResolveUrlUseCase, ShortenUrlUseCase
from src.domain.ports import UrlRepository
from src.infrastructure.persistence.memory_repository import InMemoryUrlRepository

# Repositório singleton em memória (substituível por SQLAlchemy em produção)
_repository: UrlRepository = InMemoryUrlRepository()


async def get_repository() -> AsyncGenerator[UrlRepository, None]:
    yield _repository


RepositoryDep = Annotated[UrlRepository, Depends(get_repository)]


async def get_shorten_use_case(repo: RepositoryDep) -> ShortenUrlUseCase:
    return ShortenUrlUseCase(repo)


async def get_resolve_use_case(repo: RepositoryDep) -> ResolveUrlUseCase:
    return ResolveUrlUseCase(repo)


async def get_stats_use_case(repo: RepositoryDep) -> GetStatsUseCase:
    return GetStatsUseCase(repo)


ShortenUseCaseDep = Annotated[ShortenUrlUseCase, Depends(get_shorten_use_case)]
ResolveUseCaseDep = Annotated[ResolveUrlUseCase, Depends(get_resolve_use_case)]
StatsUseCaseDep = Annotated[GetStatsUseCase, Depends(get_stats_use_case)]
