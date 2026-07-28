from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from app import events
from app.database import Base, get_db
from app.main import app
from app.models import Link  # noqa: F401 — registra o modelo no metadata

# ── Banco in-memory com StaticPool (mesma conexão em todos os acessos) ───────

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Cria as tabelas no engine de teste
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app, raise_server_exceptions=True)

# ── Constantes ────────────────────────────────────────────────────────────────

CODIGO_TESTE = "abc123"
URL_TESTE = "https://www.exemplo.com/pagina-longa"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_link() -> Link:
    db = TestingSessionLocal()
    try:
        return db.query(Link).filter(Link.codigo_curto == CODIGO_TESTE).first()
    finally:
        db.close()


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_db():
    """Limpa e repopula a tabela antes de cada teste."""
    db = TestingSessionLocal()
    try:
        db.query(Link).delete()
        db.add(
            Link(
                codigo_curto=CODIGO_TESTE,
                url_original=URL_TESTE,
                total_cliques=0,
                criado_em=datetime.utcnow(),
            )
        )
        db.commit()
    finally:
        db.close()

    events.clear_events()
    yield


# ── Testes ────────────────────────────────────────────────────────────────────

def test_redirect_codigo_existente():
    """GET /abc123 → 307 com Location = url_original; total_cliques incrementado; evento emitido."""
    response = client.get(f"/{CODIGO_TESTE}", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == URL_TESTE

    link = _get_link()
    assert link.total_cliques == 1

    emitidos = events.get_events()
    assert len(emitidos) == 1
    assert emitidos[0]["event"] == "link_redirecionado"
    assert emitidos[0]["properties"]["codigo_curto"] == CODIGO_TESTE
    assert "redirecionado_em" in emitidos[0]["properties"]


def test_redirect_codigo_inexistente():
    """GET /naoexiste → 404 com JSON correto e evento codigo_inexistente_acessado."""
    response = client.get("/naoexiste", follow_redirects=False)

    assert response.status_code == 404
    assert response.json() == {"detail": "link não encontrado"}

    emitidos = events.get_events()
    assert len(emitidos) == 1
    assert emitidos[0]["event"] == "codigo_inexistente_acessado"
    assert emitidos[0]["properties"]["codigo_curto"] == "naoexiste"
    assert "acessado_em" in emitidos[0]["properties"]


def test_redirect_publico_sem_autenticacao():
    """GET /abc123 sem headers de auth não retorna 401 nem 403."""
    response = client.get(f"/{CODIGO_TESTE}", follow_redirects=False)

    assert response.status_code not in (401, 403)


def test_contagem_cliques_consistente():
    """N requisições bem-sucedidas → total_cliques == N; acessos inexistentes não alteram contador."""
    n = 3
    for _ in range(n):
        client.get(f"/{CODIGO_TESTE}", follow_redirects=False)

    for _ in range(2):
        client.get("/naoexiste", follow_redirects=False)

    link = _get_link()
    assert link.total_cliques == n


def test_multiplos_cliques():
    """5 requisições bem-sucedidas → total_cliques == 5 e 5 eventos link_redirecionado."""
    n = 5
    for _ in range(n):
        resp = client.get(f"/{CODIGO_TESTE}", follow_redirects=False)
        assert resp.status_code == 307

    link = _get_link()
    assert link.total_cliques == n

    redirecionados = [
        e for e in events.get_events() if e["event"] == "link_redirecionado"
    ]
    assert len(redirecionados) == n
