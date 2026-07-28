"""Testes BDD — rota publica de redirecionamento com contagem de cliques.

Cenario A — Redirecionamento de codigo existente:
    HTTP 302 + Location, cliques incrementado, evento codigo_acessado.

Cenario B — Codigo inexistente:
    HTTP 404, nenhum clique alterado, evento codigo_nao_encontrado.

Cenario C — Concorrencia (N acessos simultaneos):
    cliques final == N sem race condition.

Cenario D — Acesso publico sem autenticacao.
"""

import threading
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.events import clear_events, get_events
from app.main import app
from app.models import Link
from tests.conftest import TestSessionFactory

# TestClient sem seguir redirects: inspecionamos o 302 diretamente.
client = TestClient(app, follow_redirects=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def limpar_estado():
    """Limpa tabela e eventos antes e apos cada teste."""
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


def _criar_link(url: str = "https://exemplo.com") -> str:
    """Cria um link via POST /shorten e retorna o codigo curto."""
    resp = TestClient(app).post("/shorten", json={"url": url})
    assert resp.status_code == 201, resp.json()
    return resp.json()["codigo"]


def _get_cliques(codigo: str) -> int:
    """Consulta o campo cliques diretamente no banco de testes."""
    db = TestSessionFactory()
    link = db.query(Link).filter(Link.codigo == codigo).first()
    db.close()
    return link.cliques if link else 0


# ---------------------------------------------------------------------------
# Cenario A — Redirecionamento de codigo existente
# ---------------------------------------------------------------------------

class TestCenarioA:
    def test_a1_codigo_existente_retorna_302(self):
        """Dado um codigo existente, GET /{codigo} responde 302."""
        codigo = _criar_link("https://destino.com")
        resp = client.get(f"/{codigo}")
        assert resp.status_code == 302

    def test_a2_location_aponta_para_url_original(self):
        """Location no 302 deve ser a URL de destino original."""
        url_original = "https://destino.com/caminho?q=1"
        codigo = _criar_link(url_original)
        resp = client.get(f"/{codigo}")
        assert resp.headers["location"] == url_original

    def test_a3_cliques_incrementado_em_1(self):
        """cliques deve ser exatamente 1 apos um acesso."""
        codigo = _criar_link()
        assert _get_cliques(codigo) == 0
        client.get(f"/{codigo}")
        assert _get_cliques(codigo) == 1

    def test_a4_cliques_acumulado_em_multiplos_acessos(self):
        """Cada acesso incrementa cliques em +1."""
        codigo = _criar_link()
        for esperado in range(1, 6):
            client.get(f"/{codigo}")
            assert _get_cliques(codigo) == esperado

    def test_a5_evento_codigo_acessado_emitido(self):
        """Evento codigo_acessado deve ser registrado apos redirect 302."""
        clear_events()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        eventos = [e for e in get_events() if e["event"] == "codigo_acessado"]
        assert len(eventos) == 1

    def test_a6_evento_codigo_acessado_contem_codigo_curto(self):
        """Evento codigo_acessado deve ter propriedade codigo_curto."""
        clear_events()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        evento = next(e for e in get_events() if e["event"] == "codigo_acessado")
        assert evento["codigo_curto"] == codigo

    def test_a7_evento_codigo_acessado_contem_timestamp(self):
        """Evento codigo_acessado deve ter propriedade timestamp (ISO 8601)."""
        clear_events()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        evento = next(e for e in get_events() if e["event"] == "codigo_acessado")
        assert "timestamp" in evento
        datetime.fromisoformat(evento["timestamp"])

    def test_a8_url_http_tambem_redireciona(self):
        """URLs com scheme http:// tambem devem ser redirecionadas."""
        url_original = "http://site.com"
        codigo = _criar_link(url_original)
        resp = client.get(f"/{codigo}")
        assert resp.status_code == 302
        assert resp.headers["location"] == url_original


# ---------------------------------------------------------------------------
# Cenario B — Codigo inexistente
# ---------------------------------------------------------------------------

class TestCenarioB:
    def test_b1_codigo_inexistente_retorna_404(self):
        """Dado um codigo que nao existe, GET /{codigo} responde 404."""
        resp = client.get("/codigoquenaoexiste")
        assert resp.status_code == 404

    def test_b2_404_com_mensagem_link_nao_encontrado(self):
        """Corpo do 404 deve indicar 'nao encontrado'."""
        resp = client.get("/naoexiste")
        body = resp.json()
        assert "detail" in body
        assert "encontrado" in body["detail"].lower()

    def test_b3_nenhum_cliques_alterado(self):
        """Codigo inexistente nao deve alterar cliques de nenhum registro."""
        codigo = _criar_link()
        client.get(f"/{codigo}")          # 1 clique no codigo existente
        client.get("/codigofantasma")     # nao deve afetar nada
        assert _get_cliques(codigo) == 1  # permanece 1

    def test_b4_evento_codigo_nao_encontrado_emitido(self):
        """Evento codigo_nao_encontrado deve ser emitido no 404."""
        clear_events()
        client.get("/fantasma")
        eventos = [e for e in get_events() if e["event"] == "codigo_nao_encontrado"]
        assert len(eventos) == 1

    def test_b5_evento_codigo_nao_encontrado_contem_codigo_curto(self):
        """Evento codigo_nao_encontrado deve ter propriedade codigo_curto."""
        clear_events()
        client.get("/fantasma42")
        evento = next(e for e in get_events() if e["event"] == "codigo_nao_encontrado")
        assert evento["codigo_curto"] == "fantasma42"

    def test_b6_evento_codigo_nao_encontrado_contem_timestamp(self):
        """Evento codigo_nao_encontrado deve ter propriedade timestamp (ISO 8601)."""
        clear_events()
        client.get("/fantasma")
        evento = next(e for e in get_events() if e["event"] == "codigo_nao_encontrado")
        assert "timestamp" in evento
        datetime.fromisoformat(evento["timestamp"])

    def test_b7_banco_vazio_retorna_404(self):
        """Com banco vazio, qualquer codigo deve retornar 404."""
        resp = client.get("/qualquercoisa")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Cenario C — Concorrencia (incremento atomico)
#
# Usa banco SQLite em arquivo com WAL (Write-Ahead Logging) para suportar
# multiplas conexoes simultaneas. StaticPool nao e thread-safe para acesso
# concorrente real — e adequado apenas para testes sequenciais.
# ---------------------------------------------------------------------------

_CONCURRENT_DB_URL = "sqlite:///./test_concurrent.db"


@pytest.fixture()
def concurrent_engine_and_session():
    """Engine e sessao SQLite em arquivo com WAL para testes de concorrencia."""
    eng = create_engine(
        _CONCURRENT_DB_URL,
        connect_args={"check_same_thread": False},
    )
    # Habilita WAL para permitir leituras/escritas concorrentes sem lock total.
    with eng.connect() as conn:
        conn.execute(__import__("sqlalchemy").text("PRAGMA journal_mode=WAL"))
        conn.commit()
    Base.metadata.drop_all(bind=eng)
    Base.metadata.create_all(bind=eng)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=eng)

    def _get_concurrent_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_concurrent_db
    yield eng, SessionLocal
    app.dependency_overrides[get_db] = __import__("tests.conftest", fromlist=["_get_test_db"])._get_test_db
    Base.metadata.drop_all(bind=eng)
    eng.dispose()


class TestCenarioC:
    def test_c1_N_acessos_simultaneos_sem_perda(self, concurrent_engine_and_session):
        """N acessos concorrentes devem resultar em cliques == N (sem race condition)."""
        N = 10
        eng, SessionLocal = concurrent_engine_and_session

        # Cria o link diretamente no banco concorrente.
        db = SessionLocal()
        link = Link(codigo="conctest", url_original="https://concorrencia.com")
        db.add(link)
        db.commit()
        db.close()

        erros = []

        def acessar():
            try:
                c = TestClient(app, follow_redirects=False)
                c.get("/conctest")
            except Exception as e:
                erros.append(e)

        threads = [threading.Thread(target=acessar) for _ in range(N)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert erros == [], f"Threads produziram erros: {erros}"

        db = SessionLocal()
        link_final = db.query(Link).filter(Link.codigo == "conctest").first()
        db.close()
        assert link_final.cliques == N, (
            f"Esperado cliques={N}, obtido={link_final.cliques} "
            "(possivel race condition ou perda de atualizacao)"
        )

    def test_c2_cliques_de_codigos_diferentes_sao_independentes(self, concurrent_engine_and_session):
        """Acessos a codigos distintos nao interferem nas contagens entre si."""
        eng, SessionLocal = concurrent_engine_and_session

        db = SessionLocal()
        db.add(Link(codigo="coda", url_original="https://a.com"))
        db.add(Link(codigo="codb", url_original="https://b.com"))
        db.commit()
        db.close()

        def acessar(cod):
            c = TestClient(app, follow_redirects=False)
            c.get(f"/{cod}")

        threads = (
            [threading.Thread(target=acessar, args=("coda",)) for _ in range(5)]
            + [threading.Thread(target=acessar, args=("codb",)) for _ in range(3)]
        )
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        db = SessionLocal()
        link_a = db.query(Link).filter(Link.codigo == "coda").first()
        link_b = db.query(Link).filter(Link.codigo == "codb").first()
        db.close()
        assert link_a.cliques == 5
        assert link_b.cliques == 3


# ---------------------------------------------------------------------------
# Cenario D — Acesso publico (sem autenticacao)
# ---------------------------------------------------------------------------

class TestCenarioD:
    def test_d1_sem_header_authorization_retorna_302(self):
        """Rota GET /{codigo} nao exige header Authorization."""
        codigo = _criar_link()
        resp = client.get(f"/{codigo}")
        assert resp.status_code not in (401, 403)
        assert resp.status_code == 302

    def test_d2_sem_cookies_retorna_302(self):
        """Rota GET /{codigo} nao exige cookies de sessao."""
        codigo = _criar_link()
        resp = client.get(f"/{codigo}")
        assert resp.status_code == 302

    def test_d3_codigo_inexistente_retorna_404_nao_401(self):
        """Mesmo sem autenticacao, codigo inexistente retorna 404 (nao 401/403)."""
        resp = client.get("/naoexiste")
        assert resp.status_code == 404

    def test_d4_user_agent_qualquer_aceito(self):
        """Qualquer User-Agent (ou nenhum) deve ser aceito pela rota publica."""
        codigo = _criar_link()
        for ua in [None, "curl/7.0", "Mozilla/5.0", "bot/1.0"]:
            headers = {"User-Agent": ua} if ua else {}
            resp = client.get(f"/{codigo}", headers=headers)
            assert resp.status_code == 302
