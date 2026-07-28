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

    def test_short_url_starts_with_base_url(self):
        response = client.post("/shorten", json={"url": "https://example.com"})
        body = response.json()
        assert body["short_url"].startswith(BASE_URL)

    def test_short_url_ends_with_code(self):
        response = client.post("/shorten", json={"url": "https://example.com"})
        body = response.json()
        assert body["short_url"].endswith(body["code"])

    def test_code_is_alphanumeric(self):
        response = client.post("/shorten", json={"url": "https://example.com"})
        code = response.json()["code"]
        assert code.isalnum()


# ---------------------------------------------------------------------------
# Validation / error tests
# ---------------------------------------------------------------------------


class TestShortenValidation:
    def test_missing_scheme_returns_400(self):
        response = client.post("/shorten", json={"url": "example.com"})
        assert response.status_code == 400

    def test_ftp_scheme_returns_400(self):
        response = client.post("/shorten", json={"url": "ftp://example.com"})
        assert response.status_code == 400

    def test_empty_url_returns_400(self):
        response = client.post("/shorten", json={"url": ""})
        assert response.status_code == 400

    def test_missing_url_field_returns_422(self):
        response = client.post("/shorten", json={})
        assert response.status_code == 422