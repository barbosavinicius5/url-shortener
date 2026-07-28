import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Cenário A — URL válida (http/https)
# ---------------------------------------------------------------------------

def test_url_https_retorna_201():
    resp = client.post("/encurtamentos", json={"url_original": "https://www.google.com"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["codigo_curto"] != ""
    assert "link_encurtado" in body


def test_url_http_retorna_201():
    resp = client.post("/encurtamentos", json={"url_original": "http://exemplo.com"})
    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# Cenário B — URL inválida / esquema não permitido
# ---------------------------------------------------------------------------

def test_url_ftp_retorna_422():
    resp = client.post("/encurtamentos", json={"url_original": "ftp://arquivo.com"})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body
    assert body["detail"]  # mensagem não vazia


def test_url_javascript_retorna_422():
    resp = client.post("/encurtamentos", json={"url_original": "javascript:alert(1)"})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body


def test_url_malformada_retorna_422():
    resp = client.post("/encurtamentos", json={"url_original": "nao-e-url"})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body


def test_url_vazia_retorna_422():
    resp = client.post("/encurtamentos", json={"url_original": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body


# ---------------------------------------------------------------------------
# Cenário C — Consistência de contrato
# ---------------------------------------------------------------------------

def test_contrato_campos_presentes():
    resp = client.post("/encurtamentos", json={"url_original": "https://www.exemplo.com.br/pagina-longa"})
    assert resp.status_code == 201
    body = resp.json()
    assert "codigo_curto" in body
    assert "url_original" in body
    assert "link_encurtado" in body
    assert body["url_original"] == "https://www.exemplo.com.br/pagina-longa"
    assert len(body["codigo_curto"]) == 6
