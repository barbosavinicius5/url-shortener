"""Domain entities — zero coupling to FastAPI or SQLAlchemy."""

from dataclasses import dataclass, field


@dataclass
class ShortUrl:
    """Represents a shortened URL entry."""

    id: int
    long_url: str
    short_code: str
    click_count: int = field(default=0)
    project_id: str = field(default="")
