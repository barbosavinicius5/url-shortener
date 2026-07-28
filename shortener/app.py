"""FastAPI application — URL Shortener."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from pydantic import BaseModel

from shortener import analytics, codegen, storage

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# ---------------------------------------------------------------------------
# HTML page shown when a short code is not found (t002).
# Inline to avoid a template-engine dependency — keeps the project self-contained.
# ---------------------------------------------------------------------------
_HTML_404 = """\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link não encontrado</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 4rem 1rem; color: #333; }
    h1   { font-size: 2rem; margin-bottom: 0.5rem; }
    p    { font-size: 1.1rem; color: #666; }
  </style>
</head>
<body>
  <h1>Link não encontrado</h1>
  <p>O link que você tentou acessar não existe ou foi removido.</p>
</body>
</html>
"""


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


@app.get("/{code}", response_model=None)
def redirect(code: str) -> Response:
    """Resolve a short code and redirect to the original URL.

    **Behaviour:**

    - Validates that *code* matches the expected format (alphanumeric, 6 chars).
      Returns **404 HTML** immediately if the format is invalid — no storage lookup.
    - Returns **302** with ``Location`` header set to the original URL when found.
    - Returns **404 HTML** with a friendly "link não encontrado" page when *code*
      is not present in the mapping.  No internal details or stack traces are exposed.
    - Increments ``access_count`` on every successful resolution.
    - Emits analytics events (``link_acessado`` / ``link_nao_encontrado``) in a
      fire-and-forget fashion so that analytics failures never block a redirect.
    """
    # Formato inválido: falha rápida sem consultar o storage.
    if not codegen.is_valid_code(code):
        analytics.on_link_nao_encontrado(code)
        return HTMLResponse(content=_HTML_404, status_code=404)

    # Consulta o mapeamento.
    url = storage.get(code)

    if url is None:
        # Código inexistente: retorna página HTML amigável de erro (t002).
        analytics.on_link_nao_encontrado(code)
        return HTMLResponse(content=_HTML_404, status_code=404)

    # Código existente: incrementa contador e redireciona transparentemente (t002).
    storage.increment_access_count(code)
    analytics.on_link_acessado(code, url)

    return RedirectResponse(url=url, status_code=302)