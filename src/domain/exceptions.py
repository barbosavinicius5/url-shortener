"""Exceções de domínio."""


class ShortCodeNotFoundError(Exception):
    """Levantada quando um código curto não existe."""

    def __init__(self, short_code: str) -> None:
        self.short_code = short_code
        super().__init__(f"Short code not found: {short_code!r}")


class InvalidUrlError(Exception):
    """Levantada quando a URL de destino é inválida."""

    def __init__(self, url: str) -> None:
        self.url = url
        super().__init__(f"Invalid URL: {url!r}")
