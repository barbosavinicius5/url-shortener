import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# Cenário A — Rota de documentação disponível
def test_docs_disponivel():
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_disponivel():
    response = client.get("/redoc")
    assert response.status_code == 200


def test_openapi_json_disponivel():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()


# Cenário B — Reflexo dos endpoints
def test_endpoints_presentes_na_documentacao():
    response = client.get("/openapi.json")
    spec = response.json()
    paths = spec.get("paths", {})
    # Encurtar
    assert "/shorten" in paths
    assert "post" in paths["/shorten"]
    # Redirecionar
    assert any(
        "get" in paths.get(p, {})
        for p in paths
        if "{codigo_curto}" in p and "stats" not in p
    )
    # Métricas
    assert any("stats" in p for p in paths)


# Cenário C — Nomenclatura consistente
def test_nomenclatura_codigo_curto_e_url_original():
    response = client.get("/openapi.json")
    spec_str = response.text
    assert "codigo_curto" in spec_str
    assert "url_original" in spec_str


# Cenário D — Códigos de resposta documentados
def test_codigos_de_resposta_no_shorten():
    response = client.get("/openapi.json")
    spec = response.json()
    shorten_responses = spec["paths"]["/shorten"]["post"]["responses"]
    response_codes = [str(c) for c in shorten_responses.keys()]
    # Deve ter 2xx e 400 ou 422
    assert any(c.startswith("2") for c in response_codes)
    assert any(c in ["400", "422"] for c in response_codes)


def test_codigos_de_resposta_no_redirect():
    response = client.get("/openapi.json")
    spec = response.json()
    paths = spec["paths"]
    redirect_path = next(
        p for p in paths if "{codigo_curto}" in p and "stats" not in p
    )
    redirect_responses = paths[redirect_path]["get"]["responses"]
    response_codes = [str(c) for c in redirect_responses.keys()]
    assert "404" in response_codes


def test_codigos_de_resposta_no_stats():
    response = client.get("/openapi.json")
    spec = response.json()
    paths = spec["paths"]
    stats_path = next(p for p in paths if "stats" in p)
    stats_responses = paths[stats_path]["get"]["responses"]
    response_codes = [str(c) for c in stats_responses.keys()]
    assert any(c.startswith("2") for c in response_codes)
    assert "404" in response_codes


# Testes funcionais básicos
def test_encurtar_url_valida():
    response = client.post(
        "/shorten", json={"url_original": "https://www.example.com/pagina-longa"}
    )
    assert response.status_code == 201
    data = response.json()
    assert "codigo_curto" in data
    assert "url_original" in data
    assert data["url_original"] == "https://www.example.com/pagina-longa"


def test_encurtar_url_invalida():
    response = client.post("/shorten", json={"url_original": "nao-e-uma-url"})
    assert response.status_code in [400, 422]


def test_redirecionar_codigo_existente():
    # Primeiro encurtar
    r = client.post("/shorten", json={"url_original": "https://www.google.com"})
    codigo = r.json()["codigo_curto"]
    # Redirecionar
    response = client.get(f"/{codigo}", follow_redirects=False)
    assert response.status_code in [301, 302, 307, 308]


def test_redirecionar_codigo_inexistente():
    response = client.get("/codigo-inexistente-xyz123", follow_redirects=False)
    assert response.status_code == 404


def test_stats_codigo_existente():
    r = client.post("/shorten", json={"url_original": "https://www.python.org"})
    codigo = r.json()["codigo_curto"]
    response = client.get(f"/{codigo}/stats")
    assert response.status_code == 200
    data = response.json()
    assert "codigo_curto" in data
    assert "total_cliques" in data


def test_stats_codigo_inexistente():
    response = client.get("/codigo-nao-existe-abc/stats")
    assert response.status_code == 404