"""FastAPI application — URL Shortener."""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from shortener import codegen, storage

app = FastAPI(title="URL Shortener")

# Base URL used to build the returned short_url.
# Override with the BASE_URL environment variable in production.
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Jinja2 templates directory (relative to this file).
_TEMPLATES_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))


# ---------------------------------------------------------------------------
# Schemas — internal (TASK-002 contract)
# ---------------------------------------------------------------------------

class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    code: str
    short_url: str


# ---------------------------------------------------------------------------
# Schemas — frontend contract (t002-fe)
# ---------------------------------------------------------------------------

class EncurtarRequest(BaseModel):
    url: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_url(url: str):
    """Return motivo string if url is invalid, else None."""
    url = url.strip()
    if not url:
        return "url_malformada"
    if not (url.startswith("http://") or url.startswith("https://")):
        return "esquema_invalido"
    # Must have a non-empty host after scheme://
    try:
        rest = url.split("://", 1)[1]
        if not rest or rest.startswith("/"):
            return "url_malformada"
    except IndexError:
        return "url_malformada"
    return None


# ---------------------------------------------------------------------------
# Frontend route
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    """Serve the URL-shortener HTML form."""
    return templates.TemplateResponse(request, "index.html")


# ---------------------------------------------------------------------------
# API endpoint — frontend contract (POST /encurtar)
# ---------------------------------------------------------------------------

@app.post("/encurtar", status_code=200)
def encurtar(body: EncurtarRequest) -> JSONResponse:
    """Shorten a URL — frontend-facing endpoint.

    Success (200): {"codigo": "<code>", "url_original": "<url>", "url_curta": "<base>/<code>"}
    Error   (400): {"erro": "validacao", "motivo": "esquema_invalido" | "url_malformada"}
    """
    url = body.url.strip()
    motivo = _validate_url(url)
    if motivo:
        return JSONResponse(
            status_code=400,
            content={"erro": "validacao", "motivo": motivo},
        )

    code = codegen.generate_code()
    storage.save(code, url)

    url_curta = f"{BASE_URL.rstrip('/')}/{code}"
    return JSONResponse(
        status_code=200,
        content={"codigo": code, "url_original": url, "url_curta": url_curta},
    )


# ---------------------------------------------------------------------------
# API endpoint — internal contract (POST /shorten) — kept for backwards compat
# ---------------------------------------------------------------------------

@app.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten(body: ShortenRequest) -> ShortenResponse:
    """Shorten a URL.

    **Request body**: {"url": "<string>"}

    - Validates that the URL starts with http:// or https://.
    - Generates a unique short code via the code-generation layer.
    - Persists the mapping and returns {code, short_url}.
    """
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    code = codegen.generate_code()
    storage.save(code, body.url)

    short_url = f"{BASE_URL.rstrip('/')}/{code}"
    return ShortenResponse(code=code, short_url=short_url)


# ---------------------------------------------------------------------------
# Redirect endpoint (GET /{code})
# ---------------------------------------------------------------------------

@app.get("/{code}", status_code=302)
def redirect(code: str) -> RedirectResponse:
    """Resolve a short code and redirect to the original URL.

    - Returns 302 with Location header set to the original URL.
    - Returns 404 if code is not found.
    - Increments access_count on every successful resolution.
    """
    url = storage.get(code)
    if url is None:
        raise HTTPException(status_code=404, detail="Short code not found")

    storage.increment_access_count(code)
    return RedirectResponse(url=url, status_code=302)
