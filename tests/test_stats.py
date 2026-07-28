"""
Testes para GET /stats/{codigo}
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# ─── banco in-memory compartilhado para todos os testes ──────────────────────
SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # garante uma única conexão in-memory reutilizada
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine_test
)

VALID_API_KEY = "test-api-key"
HEADERS_AUTH = {"X-API-Key": VALID_API_KEY}


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    """Cria tabelas no banco in-memory e sobrescreve dependência get_db."""
    Base.metadata.create_all(bind=engine_test)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def client(setup_db):
    return TestClient(app, raise_server_exceptions=True)


# ─── helper ──────────────────────────────────────────────────────────────────

def _criar_link(client: TestClient, url: str = "https://example.com") -> str:
    """Cria um link via POST /shorten e devolve o codigo gerado."""
    resp = client.post("/shorten", json={"url": url}, headers=HEADERS_AUTH)
    assert resp.status_code == 201, f"Falha ao criar link: {resp.text}"
    return resp.json()["codigo"]


# ─── Cenário A — código existente, API key válida → 200 ──────────────────────

def test_cenario_a_stats_codigo_existente(client):
    codigo = _criar_link(client)
    resp = client.get(f"/stats/{codigo}", headers=HEADERS_AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["codigo"] == codigo
    assert body["total_cliques"] == 0


# ─── Cenário B — fidelidade do contador ──────────────────────────────────────

def test_cenario_b_contador_incrementado(client):
    codigo = _criar_link(client, url="https://example.com/pagina")
    n = 5
    for _ in range(n):
        client.get(f"/{codigo}", follow_redirects=False)

    resp = client.get(f"/stats/{codigo}", headers=HEADERS_AUTH)
    assert resp.status_code == 200
    assert resp.json()["total_cliques"] == n


# ─── Cenário C — código inexistente → 404 ────────────────────────────────────

def test_cenario_c_codigo_inexistente(client):
    resp = client.get("/stats/naoexiste", headers=HEADERS_AUTH)
    assert resp.status_code == 404
    assert resp.json() == {"detail": "não encontrado"}


# ─── Cenário D1 — sem API key → 401 ──────────────────────────────────────────

def test_cenario_d1_sem_api_key(client):
    codigo = _criar_link(client)
    resp = client.get(f"/stats/{codigo}")
    assert resp.status_code == 401
    assert resp.json() == {"detail": "acesso negado"}


# ─── Cenário D2 — API key inválida → 401 ─────────────────────────────────────

def test_cenario_d2_api_key_invalida(client):
    codigo = _criar_link(client)
    resp = client.get(f"/stats/{codigo}", headers={"X-API-Key": "chave-errada"})
    assert resp.status_code == 401
    assert resp.json() == {"detail": "acesso negado"}


# ─── Cenário E — campos exatos na resposta de sucesso ────────────────────────

def test_cenario_e_campos_resposta(client):
    codigo = _criar_link(client)
    resp = client.get(f"/stats/{codigo}", headers=HEADERS_AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"codigo", "total_cliques"}