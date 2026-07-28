"""Schemas Pydantic para request/response dos endpoints da API."""

from pydantic import BaseModel, field_validator


class ShortenRequest(BaseModel):
    """Payload para o endpoint de encurtamento."""

    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        import re

        pattern = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)
        if not pattern.match(v):
            raise ValueError(f"Invalid URL: {v!r}")
        return v


class ShortenResponse(BaseModel):
    """Resposta do endpoint de encurtamento."""

    short_code: str
    original_url: str


class StatsResponse(BaseModel):
    """Resposta do endpoint de estatísticas."""

    short_code: str
    original_url: str
    click_count: int
