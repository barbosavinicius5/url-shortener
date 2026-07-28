"""Tests for GET /{code} redirect endpoint (TASK-003)."""

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.app import app

# TestClient with follow_redirects=False so we can assert the 302 directly.
client = TestClient(app, follow_redirects=False)


@pytest.fixture(autouse=True)
def clear_storage():
    """Reset in-memory store before every test to ensure isolation."""
    storage.clear()
    yield
    storage.clear()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _shorten(url: str) -> str:
    """Create a short code via POST /shorten and return the code."""
    c = TestClient(app)
    response = c.post("/shorten", json={"url": url})
    assert response.status_code == 201
    return response.json()["code"]


# ---------------------------------------------------------------------------
# 302 redirect tests
# ---------------------------------------------------------------------------

class TestRedirect302:
    def test_known_code_returns_302(self):
        code = _shorten("https://example.com")
        response = client.get(f"/{code}")
        assert response.status_code == 302

    def test_redirect_location_matches_original_url(self):
        original = "https://example.com/some/path?q=42"
        code = _shorten(original)
        response = client.get(f"/{code}")
        assert response.headers["location"] == original

    def test_redirect_works_for_http_url(self):
        original = "http://example.com"
        code = _shorten(original)
        response = client.get(f"/{code}")
        assert response.status_code == 302
        assert response.headers["location"] == original

    def test_access_count_incremented_on_redirect(self):
        code = _shorten("https://example.com")
        assert storage.get_access_count(code) == 0
        client.get(f"/{code}")
        assert storage.get_access_count(code) == 1

    def test_access_count_incremented_on_each_call(self):
        code = _shorten("https://example.com")
        client.get(f"/{code}")
        client.get(f"/{code}")
        client.get(f"/{code}")
        assert storage.get_access_count(code) == 3

    def test_access_count_starts_at_zero(self):
        code = _shorten("https://example.com")
        assert storage.get_access_count(code) == 0

    def test_multiple_codes_have_independent_counters(self):
        code_a = _shorten("https://a.com")
        code_b = _shorten("https://b.com")
        client.get(f"/{code_a}")
        client.get(f"/{code_a}")
        client.get(f"/{code_b}")
        assert storage.get_access_count(code_a) == 2
        assert storage.get_access_count(code_b) == 1


# ---------------------------------------------------------------------------
# 404 not-found tests
# ---------------------------------------------------------------------------

class TestRedirect404:
    def test_unknown_code_returns_404(self):
        response = client.get("/nonexistent")
        assert response.status_code == 404

    def test_404_response_has_detail(self):
        response = client.get("/doesnotexist")
        body = response.json()
        assert "detail" in body

    def test_404_detail_message(self):
        response = client.get("/nothere")
        assert response.json()["detail"] == "Short code not found"

    def test_empty_store_always_404(self):
        # storage is cleared by fixture -- any code must 404
        response = client.get("/abc123")
        assert response.status_code == 404
