"""Tests for POST /urls endpoint - CA-01 through CA-10."""
from __future__ import annotations

import re

from httpx import AsyncClient

BASE62_RE = re.compile(r"^[0-9A-Za-z]{7}$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def assert_short_code_valid(short_code: str) -> None:
    assert BASE62_RE.match(short_code), f"short_code '{short_code}' is not valid Base62 of length 7"


# ---------------------------------------------------------------------------
# CA-01 / CA-10: Valid URL -> 201, proper response shape
# ---------------------------------------------------------------------------


async def test_ca01_valid_https_url_returns_201(client: AsyncClient) -> None:
    """CA-01/CA-10: Valid https URL -> 201 + short_code (7 chars Base62) + short_url present."""
    resp = await client.post("/urls", json={"long_url": "https://example.com/some/very/long/path"})
    assert resp.status_code == 201
    data = resp.json()
    assert "short_code" in data
    assert "short_url" in data
    assert_short_code_valid(data["short_code"])
    assert data["short_url"].endswith(data["short_code"])


async def test_ca01_valid_http_url_returns_201(client: AsyncClient) -> None:
    """CA-01: Valid http URL -> 201 + short_code 7 chars Base62."""
    resp = await client.post("/urls", json={"long_url": "http://example.com/path"})
    assert resp.status_code == 201
    data = resp.json()
    assert_short_code_valid(data["short_code"])
    assert "short_url" in data


# ---------------------------------------------------------------------------
# CA-02: Disallowed schemes -> 422, no persistence
# ---------------------------------------------------------------------------


async def test_ca02_ftp_scheme_returns_422(client: AsyncClient) -> None:
    """CA-02: ftp:// scheme -> 422."""
    resp = await client.post("/urls", json={"long_url": "ftp://example.com/file.txt"})
    assert resp.status_code == 422


async def test_ca02_javascript_scheme_returns_422(client: AsyncClient) -> None:
    """CA-02: javascript: scheme -> 422."""
    resp = await client.post("/urls", json={"long_url": "javascript:alert(1)"})
    assert resp.status_code == 422


async def test_ca02_data_scheme_returns_422(client: AsyncClient) -> None:
    """CA-02: data: scheme -> 422."""
    resp = await client.post("/urls", json={"long_url": "data:text/html,<h1>hi</h1>"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# CA-03: Idempotency - same long_url twice -> same short_code, second call -> 200
# ---------------------------------------------------------------------------


async def test_ca03_idempotent_same_url_returns_200_on_second_call(client: AsyncClient) -> None:
    """CA-03: Same long_url twice -> same short_code, second response 200."""
    url = "https://idempotent.example.com/path?foo=bar"
    resp1 = await client.post("/urls", json={"long_url": url})
    assert resp1.status_code == 201
    data1 = resp1.json()

    resp2 = await client.post("/urls", json={"long_url": url})
    assert resp2.status_code == 200
    data2 = resp2.json()

    assert data1["short_code"] == data2["short_code"]
    assert data1["short_url"] == data2["short_url"]


# ---------------------------------------------------------------------------
# CA-04: Missing / blank long_url -> 422
# ---------------------------------------------------------------------------


async def test_ca04_missing_long_url_returns_422(client: AsyncClient) -> None:
    """CA-04: long_url absent -> 422."""
    resp = await client.post("/urls", json={})
    assert resp.status_code == 422


async def test_ca04_empty_string_long_url_returns_422(client: AsyncClient) -> None:
    """CA-04: long_url = '' -> 422."""
    resp = await client.post("/urls", json={"long_url": ""})
    assert resp.status_code == 422


async def test_ca04_whitespace_only_long_url_returns_422(client: AsyncClient) -> None:
    """CA-04: long_url only whitespace -> 422."""
    resp = await client.post("/urls", json={"long_url": "   "})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# CA-05: Malformed URLs -> 422
# ---------------------------------------------------------------------------


async def test_ca05_url_without_netloc_returns_422(client: AsyncClient) -> None:
    """CA-05: 'http://' (no netloc) -> 422."""
    resp = await client.post("/urls", json={"long_url": "http://"})
    assert resp.status_code == 422


async def test_ca05_not_a_url_returns_422(client: AsyncClient) -> None:
    """CA-05: plain string -> 422."""
    resp = await client.post("/urls", json={"long_url": "not-a-url"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# CA-09: 10 distinct URLs -> 10 distinct short_codes (no collision)
# ---------------------------------------------------------------------------


async def test_ca09_ten_distinct_urls_produce_distinct_short_codes(client: AsyncClient) -> None:
    """CA-09: 10 different URLs -> 10 distinct short_codes."""
    short_codes: list[str] = []
    for i in range(10):
        resp = await client.post("/urls", json={"long_url": f"https://example.com/path/{i}"})
        assert resp.status_code == 201
        data = resp.json()
        assert_short_code_valid(data["short_code"])
        short_codes.append(data["short_code"])

    assert len(set(short_codes)) == 10, f"Collision detected: {short_codes}"


# ---------------------------------------------------------------------------
# Extra: short_url points to the right host
# ---------------------------------------------------------------------------


async def test_short_url_contains_host(client: AsyncClient) -> None:
    """short_url must include the base URL and the short_code."""
    resp = await client.post("/urls", json={"long_url": "https://example.com/check-host"})
    assert resp.status_code == 201
    data = resp.json()
    assert "localhost" in data["short_url"]
    assert data["short_code"] in data["short_url"]
