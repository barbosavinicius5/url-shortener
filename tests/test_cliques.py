"""
Testes BDD — GET /links/{codigo_curto}/cliques

Cenário A — Link com cliques
Cenário B — Estado vazio (total_cliques == 0)
Cenário C — Link inexistente → 404
Cenário D — Consistência de telemetria
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import Link  # noqa: F401


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    def inserir_link(codigo_curto: str, total_cliques: int) -> None:
        db = Session()
        try:
            link = Link(
                codigo_curto=codigo_curto,
                url_original="https://exemplo.com",
                total_cliques=total_cliques,
            )
            db.add(link)
            db.commit()
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        c.inserir_link = inserir_link
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_cenario_a_link_com_cliques(client):
    """Cenário A: link com cliques retorna 200 e total correto."""
    client.inserir_link("abc123", total_cliques=5)
    response = client.get("/links/abc123/cliques")
    assert response.status_code == 200
    data = response.json()
    assert data["codigo_curto"] == "abc123"
    assert data["total_cliques"] == 5


def test_cenario_b_estado_vazio(client):
    """Cenário B: link sem cliques retorna 200 com total_cliques == 0."""
    client.inserir_link("zero000", total_cliques=0)
    response = client.get("/links/zero000/cliques")
    assert response.status_code == 200
    data = response.json()
    assert data["codigo_curto"] == "zero000"
    assert data["total_cliques"] == 0


def test_cenario_c_link_inexistente(client):
    """Cenário C: código inexistente retorna 404."""
    response = client.get("/links/inexistente_xyz/cliques")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "encontrado" in data["detail"].lower()


def test_cenario_d_consistencia_telemetria(client):
    """Cenário D: valor retornado deriva do campo total_cliques do modelo."""
    client.inserir_link("tel333", total_cliques=3)
    response = client.get("/links/tel333/cliques")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["total_cliques"], int)
    assert data["total_cliques"] == 3
    assert data["codigo_curto"] == "tel333"
