from abc import ABC, abstractmethod
from typing import Optional

from url_shortener.domain.entities import Link


class AbstractLinkReadRepository(ABC):
    @abstractmethod
    async def get_by_short_code(self, short_code: str) -> Optional[Link]: ...
