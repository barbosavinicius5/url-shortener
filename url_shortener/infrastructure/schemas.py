"""Infrastructure: Pydantic schemas for the POST /urls endpoint."""
from __future__ import annotations

from pydantic import BaseModel, field_validator


class ShortenRequest(BaseModel):
    """Request body for POST /urls."""

    long_url: str

    @field_validator("long_url")
    @classmethod
    def long_url_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("long_url must not be empty or whitespace")
        return v


class ShortenResponse(BaseModel):
    """Successful response body for POST /urls."""

    short_code: str
    short_url: str
