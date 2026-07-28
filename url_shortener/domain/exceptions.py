"""Domain exceptions — stdlib only."""


class ShortUrlNotFoundError(Exception):
    """Raised when a short URL is not found in the repository."""

    def __init__(self, short_code: str) -> None:
        super().__init__(f"Short URL not found: {short_code}")
        self.short_code = short_code


class InvalidShortCodeFormatError(Exception):
    """Raised when the short_code does not match Base62 format."""

    def __init__(self, short_code: str) -> None:
        super().__init__(f"Invalid short code format: {short_code}")
        self.short_code = short_code
