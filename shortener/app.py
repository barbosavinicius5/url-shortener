"""FastAPI application — URL Shortener."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from shortener import codegen, storage

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    code: str
    short_url: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten(body: ShortenRequest) -> ShortenResponse:
    """Shorten a URL.

    **Request body**: ``{ "url": "<string>" }``

    - Validates that the URL starts with ``http://`` or ``https://``.
    - Generates a unique short code via the code-generation layer.
    - Persists the mapping and returns ``{ code, short_url }``.
    """
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    code = codegen.generate_code()
    storage.save(code, body.url)

    short_url = f"{BASE_URL.rstrip('/')}/{code}"
    return ShortenResponse(code=code, short_url=short_url)


@app.get("/{code}", status_code=302)
def redirect(code: str) -> RedirectResponse:
    """Resolve a short code and redirect to the original URL.

    - Returns **302** with ``Location`` header set to the original URL.
    - Returns **404** if *code* is not found.
    - Increments ``access_count`` on every successful resolution.
    """
    url = storage.get(code)
    if url is None:
        raise HTTPException(status_code=404, detail="Short code not found")

    storage.increment_access_count(code)
    return RedirectResponse(url=url, status_code=302)
