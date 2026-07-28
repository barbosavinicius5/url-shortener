from dataclasses import dataclass


@dataclass
class Link:
    short_code: str
    original_url: str
    is_permanent: bool = False  # True → 301, False → 302 (default)
