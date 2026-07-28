"""Tests for POST /shorten endpoint (TASK-002)."""

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.app import BASE_URL, app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_storage():
    """Reset in-memory store before every test to ensure isolation."""
    storage.clear()
    yield
    storage.clear()


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------

class TestShortenHappyPath:
    def test_http_url_returns_201(self):
        response = client.post("/shorten", json={"url": "http://example.com"})
        assert response.status_code == 201

    def test_https_url_returns_201(self):
        response = client.post("/shorten", json={"url": "https://example.com/path?q=1"})
        assert response.status_code == 201

    def test_response_contains_code(self):
        response = client.post("/shorten", json={"url": "https://example.com"})
        body = response.json()
        assert "code" in body
        assert isinstance(body["code"], str)
        assert len(body["code"]) > 0

    def test_response_contains_short_url(self):
        response = client.post("/shorten", json={"url": "https://example.com"})
        body = response.json()
        assert "short_url" in body
        assert body["short_url"].startswith(BASE_URL.rstrip("/") + "/")

    def test_short_url_ends_with_code(self):
        response = client.post("/shorten", json={"url": "https://example.com"})
        body = response.json()
        assert body["short_url"].endswith(body["code"])

    def test_mapping_is_persisted(self):
        url = "https://example.com/stored"
        response = client.post("/shorten", json={"url": url})
        code = response.json()["code"]
        assert storage.get(code) == url

    def test_two_calls_produce_different_codes(self):
        r1 = client.post("/shorten", json={"url": "https://a.com"})
        r2 = client.post("/shorten", json={"url": "https://b.com"})
        # Codes are random; collision is astronomically unlikely with 62^6 space.
        assert r1.json()["code"] != r2.json()["code"]


# ---------------------------------------------------------------------------
# 400 / validation tests
# ---------------------------------------------------------------------------

class TestShortenValidation:
    def test_ftp_url_returns_400(self):
        response = client.post("/shorten", json={"url": "ftp://bad.example.com"})
        assert response.status_code == 400

    def test_plain_string_returns_400(self):
        response = client.post("/shorten", json={"url": "not-a-url"})
        assert response.status_code == 400

    def test_empty_string_returns_400(self):
        response = client.post("/shorten", json={"url": ""})
        assert response.status_code == 400

    def test_missing_url_field_returns_422(self):
        """Pydantic validation: missing required field → 422 Unprocessable Entity."""
        response = client.post("/shorten", json={})
        assert response.status_code == 422

    def test_400_response_has_detail(self):
        response = client.post("/shorten", json={"url": "not-a-url"})
        body = response.json()
        assert "detail" in body