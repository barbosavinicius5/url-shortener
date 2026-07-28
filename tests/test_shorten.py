import pytest
from fastapi.testclient import TestClient

from app.events import clear_events, get_events
from app.main import app
from app.models import Link
from tests.conftest import TestSessionFactory

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def limpar_estado():
    db = TestSessionFactory()
    db.query(Link).delete()
    db.commit()
    db.close()
    clear_events()
    yield
    db = TestSessionFactory()
    db.query(Link).delete()
    db.commit()
    db.close()
    clear_events()


# ──────────────────────────────────────────────────────────────────────────────
# Cenário A — URL válida
# ──────────────────────────────────────────────────────────────────────────────


def test_cenario_a_url_valida_retorna_codigo_unico():
    response = client.post(
        "/shorten", json={"url": "https://exemplo.com/caminho/longo"}
    )
    assert response.status_code == 201
    data = response.json()
    assert "codigo" in data
    assert data["url_original"] == "https://exemplo.com/caminho/longo"
    assert len(data["codigo"]) > 0
    events = get_events()
    link_events = [e for e in events if e["event"] == "link_encurtado"]
    assert len(link_events) >= 1
    assert link_events[-1]["codigo"] == data["codigo"]
    assert link_events[-1]["url_original"] == "https://exemplo.com/caminho/longo"
    assert "timestamp" in link_events[-1]


def test_cenario_a_persistencia_mapeamento():
    r1 = client.post("/shorten", json={"url": "https://a.com"})
    r2 = client.post("/shorten", json={"url": "https://b.com"})
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["codigo"] != r2.json()["codigo"]


# ──────────────────────────────────────────────────────────────────────────────
# Cenário B — Esquema inválido
# ──────────────────────────────────────────────────────────────────────────────


def test_cenario_b_esquema_invalido():
    response = client.post("/shorten", json={"url": "ftp://exemplo.com/arquivo"})
    assert response.status_code == 422
    data = response.json()
    detail = data.get("detail", data)
    assert detail["erro"] == "validacao"
    assert detail["motivo"] == "esquema_invalido"
    events = get_events()
    rejeitadas = [e for e in events if e["event"] == "url_rejeitada"]
    assert any(e["motivo"] == "esquema_invalido" for e in rejeitadas)


def test_cenario_b_esquema_mailto():
    response = client.post("/shorten", json={"url": "mailto:user@example.com"})
    assert response.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# Cenário C — URL malformada / maliciosa
# ──────────────────────────────────────────────────────────────────────────────


def test_cenario_c_url_malformada():
    response = client.post("/shorten", json={"url": "nao-e-uma-url"})
    assert response.status_code == 422
    data = response.json()
    detail = data.get("detail", data)
    assert detail["erro"] == "validacao"
    assert detail["motivo"] == "url_malformada"
    events = get_events()
    rejeitadas = [e for e in events if e["event"] == "url_rejeitada"]
    assert any(e["motivo"] == "url_malformada" for e in rejeitadas)


def test_cenario_c_entrada_maliciosa_xss():
    response = client.post(
        "/shorten", json={"url": "https://site.com/<script>alert(1)</script>"}
    )
    assert response.status_code == 422


def test_cenario_c_javascript_scheme():
    response = client.post("/shorten", json={"url": "javascript:alert(1)"})
    assert response.status_code == 422


# ──────────────────────────────────────────────────────────────────────────────
# Cenário D — Unicidade e imutabilidade
# ──────────────────────────────────────────────────────────────────────────────


def test_cenario_d_unicidade_codigos():
    urls = [f"https://example.com/path/{i}" for i in range(20)]
    codigos = set()
    for url in urls:
        r = client.post("/shorten", json={"url": url})
        assert r.status_code == 201
        codigos.add(r.json()["codigo"])
    assert len(codigos) == 20  # zero colisoes


def test_cenario_d_imutabilidade_mapeamento():
    r = client.post("/shorten", json={"url": "https://imutavel.com/teste"})
    assert r.status_code == 201
    codigo = r.json()["codigo"]
    url_original = r.json()["url_original"]

    db = TestSessionFactory()
    try:
        link = db.query(Link).filter(Link.codigo == codigo).first()
    finally:
        db.close()
    assert link is not None
    assert link.url_original == url_original
