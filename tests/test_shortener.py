import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories import url_repository
from app.events import analytics

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_state():
    """Garante repositório e lista de eventos limpos antes de cada teste."""
    url_repository.clear()
    analytics.clear_events()
    yield
    url_repository.clear()
    analytics.clear_events()


# ---------------------------------------------------------------------------
# Scenario A — Sucesso
# ---------------------------------------------------------------------------

class TestScenarioASuccess:
    def test_returns_201_for_valid_https_url(self):
        resp = client.post("/shorten", json={"url_original": "https://exemplo.com/pagina"})
        assert resp.status_code == 201

    def test_response_contains_codigo_with_6_to_8_chars(self):
        resp = client.post("/shorten", json={"url_original": "https://exemplo.com/pagina"})
        assert resp.status_code == 201
        data = resp.json()
        assert "codigo" in data
        assert 6 <= len(data["codigo"]) <= 8

    def test_response_contains_url_encurtada_and_url_original(self):
        resp = client.post("/shorten", json={"url_original": "https://exemplo.com/pagina"})
        assert resp.status_code == 201
        data = resp.json()
        assert "url_encurtada" in data
        assert "url_original" in data
        assert data["url_original"] == "https://exemplo.com/pagina"

    def test_field_named_codigo_not_code_or_short_code(self):
        resp = client.post("/shorten", json={"url_original": "https://exemplo.com/pagina"})
        assert resp.status_code == 201
        data = resp.json()
        assert "codigo" in data
        assert "code" not in data
        assert "short_code" not in data

    def test_valid_http_url_also_accepted(self):
        resp = client.post("/shorten", json={"url_original": "http://exemplo.com"})
        assert resp.status_code == 201


# ---------------------------------------------------------------------------
# Scenario B — URL inválida (malformada)
# ---------------------------------------------------------------------------

class TestScenarioBInvalidUrl:
    def test_malformed_url_returns_422(self):
        resp = client.post("/shorten", json={"url_original": "nao-e-uma-url"})
        assert resp.status_code == 422

    def test_malformed_url_response_has_erro_true_and_motivo(self):
        resp = client.post("/shorten", json={"url_original": "nao-e-uma-url"})
        data = resp.json()
        assert data.get("erro") is True
        assert "motivo" in data
        assert data["motivo"]  # não vazio

    def test_malformed_url_no_codigo_in_response(self):
        resp = client.post("/shorten", json={"url_original": "nao-e-uma-url"})
        data = resp.json()
        assert "codigo" not in data


# ---------------------------------------------------------------------------
# Scenario B2 — Esquema inválido (ftp://)
# ---------------------------------------------------------------------------

class TestScenarioB2InvalidScheme:
    def test_ftp_scheme_returns_422(self):
        resp = client.post("/shorten", json={"url_original": "ftp://servidor.com/arquivo"})
        assert resp.status_code == 422

    def test_ftp_scheme_response_has_erro_true_and_motivo(self):
        resp = client.post("/shorten", json={"url_original": "ftp://servidor.com/arquivo"})
        data = resp.json()
        assert data.get("erro") is True
        assert "motivo" in data


# ---------------------------------------------------------------------------
# Scenario C — Unicidade
# ---------------------------------------------------------------------------

class TestScenarioCUniqueness:
    def test_two_calls_produce_different_codigos(self):
        resp1 = client.post("/shorten", json={"url_original": "https://a.com"})
        resp2 = client.post("/shorten", json={"url_original": "https://b.com"})
        assert resp1.status_code == 201
        assert resp2.status_code == 201
        assert resp1.json()["codigo"] != resp2.json()["codigo"]


# ---------------------------------------------------------------------------
# Scenario D — Re-shortening (mesma URL → novo código)
# ---------------------------------------------------------------------------

class TestScenarioDReShortening:
    def test_same_url_twice_produces_different_codigos(self):
        url = "https://exemplo.com/mesma-pagina"
        resp1 = client.post("/shorten", json={"url_original": url})
        resp2 = client.post("/shorten", json={"url_original": url})
        assert resp1.status_code == 201
        assert resp2.status_code == 201
        assert resp1.json()["codigo"] != resp2.json()["codigo"]


# ---------------------------------------------------------------------------
# Scenario E — Consistência do campo
# ---------------------------------------------------------------------------

class TestScenarioEFieldConsistency:
    def test_success_response_always_has_codigo(self):
        for url in ["https://a.com", "https://b.com", "http://c.org/path"]:
            resp = client.post("/shorten", json={"url_original": url})
            assert resp.status_code == 201
            assert "codigo" in resp.json()


# ---------------------------------------------------------------------------
# Eventos (Analytics)
# ---------------------------------------------------------------------------

class TestEvents:
    def test_success_emits_url_encurtada_event(self):
        resp = client.post("/shorten", json={"url_original": "https://exemplo.com"})
        assert resp.status_code == 201
        events = [e for e in analytics.emitted_events if e["event"] == "url_encurtada"]
        assert len(events) == 1
        ev = events[0]
        assert ev["codigo"] == resp.json()["codigo"]
        assert ev["url_original"] == "https://exemplo.com"
        assert "timestamp" in ev
        assert ev["timestamp"]  # não vazio

    def test_failure_emits_url_invalida_rejeitada_event(self):
        resp = client.post("/shorten", json={"url_original": "nao-e-uma-url"})
        assert resp.status_code == 422
        events = [e for e in analytics.emitted_events if e["event"] == "url_invalida_rejeitada"]
        assert len(events) == 1
        ev = events[0]
        assert "motivo" in ev
        assert ev["motivo"]
        assert "timestamp" in ev

    def test_invalid_scheme_emits_url_invalida_rejeitada_event(self):
        resp = client.post("/shorten", json={"url_original": "ftp://servidor.com"})
        assert resp.status_code == 422
        events = [e for e in analytics.emitted_events if e["event"] == "url_invalida_rejeitada"]
        assert len(events) == 1