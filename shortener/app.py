"""FastAPI application — URL Shortener."""

import os
import re

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from pydantic import BaseModel

from shortener import codegen, storage

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Accepted short-code format: 1–32 alphanumeric characters.
_CODE_PATTERN = re.compile(r"^[A-Za-z0-9]{1,32}$")

# ---------------------------------------------------------------------------
# HTML template for the "link not found" page (404)
# ---------------------------------------------------------------------------

_404_HTML = """\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link não encontrado — Encurtador de URL</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
      color: #333;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      padding: 2.5rem 3rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.12);
      text-align: center;
      max-width: 480px;
      width: 90%;
    }
    h1 { font-size: 1.6rem; margin-bottom: .5rem; }
    p  { color: #555; line-height: 1.6; }
    a  { color: #0070f3; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔗 Link não encontrado</h1>
    <p>
      O link que você tentou acessar não existe ou já expirou.<br>
      Verifique se o endereço está correto e tente novamente.
    </p>
    <p><a href="/">Voltar ao início</a></p>
  </div>
</body>
</html>
"""


def _not_found_response() -> HTMLResponse:
    """Return a 404 HTML response with a user-friendly 'link not found' page."""
    return HTMLResponse(content=_404_HTML, status_code=404)


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
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    code = codegen.generate_code()
    storage.save(code, body.url)

    short_url = f"{BASE_URL.rstrip('/')}/{code}"
    return ShortenResponse(code=code, short_url=short_url)


@app.get("/{code}", response_model=None, status_code=302)
def redirect(code: str) -> Response:
    """Resolve a short code and redirect to the original URL.

    - Returns **302** with ``Location`` header set to the original URL.
    - Returns **404** HTML page if *code* has an invalid format or is not found.
    - Increments ``access_count`` on every successful resolution.
    """
    # Reject codes with invalid format immediately (no storage lookup needed).
    if not _CODE_PATTERN.match(code):
        return _not_found_response()

    url = storage.get(code)
    if url is None:
        return _not_found_response()

    storage.increment_access_count(code)
    return RedirectResponse(url=url, status_code=302)
