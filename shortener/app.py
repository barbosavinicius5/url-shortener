"""FastAPI application — URL Shortener."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from shortener import analytics, codegen, storage

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

    **Behaviour:**

    - Validates that *code* matches the expected format (alphanumeric, 6 chars).
      Returns **404** immediately if the format is invalid — no storage lookup.
    - Returns **302** with ``Location`` header set to the original URL when found.
    - Returns **404** when *code* is not present in the mapping.
    - Increments ``access_count`` on every successful resolution.
    - Emits analytics events (``link_acessado`` / ``link_nao_encontrado``) in a
      fire-and-forget fashion so that analytics failures never block a redirect.
    """
    # Cenário C — formato inválido: falha rápida sem consultar o storage.
    if not codegen.is_valid_code(code):
        analytics.on_link_nao_encontrado(code)
        raise HTTPException(status_code=404, detail="Short code not found")

    # Cenários A / B — consulta o mapeamento.
    url = storage.get(code)

    if url is None:
        # Cenário B — código inexistente.
        analytics.on_link_nao_encontrado(code)
        raise HTTPException(status_code=404, detail="Short code not found")

    # Cenário A — código existente: incrementa contador e redireciona.
    storage.increment_access_count(code)
    analytics.on_link_acessado(code, url)

    return RedirectResponse(url=url, status_code=302)