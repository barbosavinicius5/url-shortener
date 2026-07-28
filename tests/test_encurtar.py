"""Tests for the frontend endpoints — GET / and POST /encurtar (t002-fe).

Covers:
  - Cenário A: sucesso — retorna codigo e url_curta.
  - Cenário B: erro esquema_invalido — mensagem correta, sem código.
  - Cenário C: erro url_malformada — mensagem correta, sem código.
  - Cenário D: loading state verificado via estrutura do HTML e comportamento do endpoint.
  - GET /: retorna 200 com o formulário HTML.
"""

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
# GET / — página do formulário
# ---------------------------------------------------------------------------

class TestIndexPage:
    def test_get_index_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_get_index_content_type_is_html(self):
        response = client.get("/")
        assert "text/html" in response.headers["content-type"]

    def test_get_index_contains_form(self):
        response = client.get("/")
        assert b"<form" in response.content

    def test_get_index_contains_submit_button(self):
        response = client.get("/")
        assert b'type="submit"' in response.content

    def test_get_index_contains_url_input(self):
        response = client.get("/")
        assert b'id="url-input"' in response.content

    def test_get_index_contains_result_box(self):
        response = client.get("/")
        assert b'id="result-box"' in response.content

    def test_get_index_contains_error_box(self):
        response = client.get("/")
        assert b'id="error-box"' in response.content

    def test_get_index_contains_loading_indicator(self):
        response = client.get("/")
        assert b'id="loading-indicator"' in response.content

    def test_get_index_result_code_element_present(self):
        response = client.get("/")
        assert b'id="result-code"' in response.content

    def test_get_index_result_link_element_present(self):
        response = client.get("/")
        assert b'id="result-link"' in response.content


# ---------------------------------------------------------------------------
# Cenário A — Sucesso
# ---------------------------------------------------------------------------

class TestEncurtarSuccess:
    def test_valid_https_url_returns_200(self):
        response = client.post("/encurtar", json={"url": "https://example.com"})
        assert response.status_code == 200

    def test_valid_http_url_returns_200(self):
        response = client.post("/encurtar", json={"url": "http://example.com/path"})
        assert response.status_code == 200

    def test_success_response_contains_codigo(self):
        response = client.post("/encurtar", json={"url": "https://example.com"})
        body = response.json()
        assert "codigo" in body
        assert isinstance(body["codigo"], str)
        assert len(body["codigo"]) > 0

    def test_success_response_contains_url_curta(self):
        response = client.post("/encurtar", json={"url": "https://example.com"})
        body = response.json()
        assert "url_curta" in body
        assert body["url_curta"].startswith(BASE_URL.rstrip("/") + "/")

    def test_success_response_url_curta_ends_with_codigo(self):
        response = client.post("/encurtar", json={"url": "https://example.com"})
        body = response.json()
        assert body["url_curta"].endswith(body["codigo"])

    def test_success_response_contains_url_original(self):
        url = "https://example.com/some/path"
        response = client.post("/encurtar", json={"url": url})
        body = response.json()
        assert body["url_original"] == url

    def test_success_does_not_contain_erro_key(self):
        response = client.post("/encurtar", json={"url": "https://example.com"})
        body = response.json()
        assert "erro" not in body

    def test_success_mapping_is_persisted(self):
        url = "https://example.com/persisted"
        response = client.post("/encurtar", json={"url": url})
        code = response.json()["codigo"]
        assert storage.get(code) == url

    def test_two_calls_produce_different_codes(self):
        r1 = client.post("/encurtar", json={"url": "https://a.com"})
        r2 = client.post("/encurtar", json={"url": "https://b.com"})
        assert r1.json()["codigo"] != r2.json()["codigo"]


# ---------------------------------------------------------------------------
# Cenário B — Erro esquema_invalido
# ---------------------------------------------------------------------------

class TestEncurtarEsquemaInvalido:
    def test_ftp_url_returns_400(self):
        response = client.post("/encurtar", json={"url": "ftp://bad.example.com"})
        assert response.status_code == 400

    def test_ftp_url_motivo_esquema_invalido(self):
        response = client.post("/encurtar", json={"url": "ftp://bad.example.com"})
        body = response.json()
        assert body.get("motivo") == "esquema_invalido"

    def test_ftp_url_erro_field_is_validacao(self):
        response = client.post("/encurtar", json={"url": "ftp://bad.example.com"})
        body = response.json()
        assert body.get("erro") == "validacao"

    def test_ftp_url_no_codigo_in_response(self):
        response = client.post("/encurtar", json={"url": "ftp://bad.example.com"})
        body = response.json()
        assert "codigo" not in body

    def test_ftp_url_no_url_curta_in_response(self):
        response = client.post("/encurtar", json={"url": "ftp://bad.example.com"})
        body = response.json()
        assert "url_curta" not in body

    def test_bare_string_without_scheme_returns_esquema_invalido(self):
        response = client.post("/encurtar", json={"url": "example.com"})
        body = response.json()
        assert response.status_code == 400
        assert body.get("motivo") == "esquema_invalido"


# ---------------------------------------------------------------------------
# Cenário C — Erro url_malformada
# ---------------------------------------------------------------------------

class TestEncurtarUrlMalformada:
    def test_empty_url_returns_400(self):
        response = client.post("/encurtar", json={"url": ""})
        assert response.status_code == 400

    def test_empty_url_motivo_url_malformada(self):
        response = client.post("/encurtar", json={"url": ""})
        body = response.json()
        assert body.get("motivo") == "url_malformada"

    def test_empty_url_erro_field_is_validacao(self):
        response = client.post("/encurtar", json={"url": ""})
        body = response.json()
        assert body.get("erro") == "validacao"

    def test_empty_url_no_codigo_in_response(self):
        response = client.post("/encurtar", json={"url": ""})
        body = response.json()
        assert "codigo" not in body

    def test_empty_url_no_url_curta_in_response(self):
        response = client.post("/encurtar", json={"url": ""})
        body = response.json()
        assert "url_curta" not in body

    def test_https_without_host_returns_url_malformada(self):
        response = client.post("/encurtar", json={"url": "https://"})
        body = response.json()
        assert response.status_code == 400
        assert body.get("motivo") == "url_malformada"

    def test_missing_url_field_returns_422(self):
        """Pydantic validation: missing required field -> 422 Unprocessable Entity."""
        response = client.post("/encurtar", json={})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Cenário D — Loading state / prevenção de envio duplicado
# ---------------------------------------------------------------------------

class TestEncurtarLoadingState:
    """O indicador de loading e o bloqueio de botão são comportamento de JS.
    No nível da API, validamos que o endpoint responde corretamente a requisições
    sequenciais, e verificamos que o HTML contém os elementos e scripts necessários.
    """

    def test_sequential_calls_are_independent(self):
        """Duas chamadas sequenciais com a mesma URL geram códigos distintos."""
        url = "https://example.com/dup"
        r1 = client.post("/encurtar", json={"url": url})
        r2 = client.post("/encurtar", json={"url": url})
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["codigo"] != r2.json()["codigo"]

    def test_endpoint_returns_json_content_type(self):
        """A resposta tem Content-Type application/json para o FE processar."""
        response = client.post("/encurtar", json={"url": "https://example.com"})
        assert "application/json" in response.headers["content-type"]

    def test_error_response_returns_json_content_type(self):
        response = client.post("/encurtar", json={"url": "ftp://bad"})
        assert "application/json" in response.headers["content-type"]

    def test_submit_btn_disabled_logic_present_in_html(self):
        """Verifica que o HTML contém o script que desabilita o botão durante loading."""
        response = client.get("/")
        html = response.text
        assert "submitBtn.disabled" in html

    def test_loading_indicator_controlled_by_script(self):
        """Verifica que o script JS controla a visibilidade do indicador de loading."""
        response = client.get("/")
        html = response.text
        assert "loading-indicator" in html
        assert "setLoading" in html

    def test_fetch_targets_encurtar_endpoint(self):
        """O script JS faz fetch para /encurtar."""
        response = client.get("/")
        html = response.text
        assert "'/encurtar'" in html or '"/encurtar"' in html
