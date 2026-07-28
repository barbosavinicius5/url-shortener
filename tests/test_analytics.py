"""Testes de analytics -- 5 cenarios BDD (t002).

Cenario A: Acesso a codigo valido -> evento link_acessado registrado.
Cenario B: Acesso a codigo inexistente -> evento link_nao_encontrado registrado.
Cenario C: N acessos validos -> contar_cliques == N (COUNT derivado dos eventos).
Cenario D: Falha no subsistema de analytics -> redirecionamento 302 normal (sem erro 500).
Cenario E: Campos referrer e user_agent sao opcionais (None aceito sem erro).
"""

import sqlite3
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.analytics.repository import AnalyticsRepository, _DB_NAME
from shortener.analytics.service import AnalyticsService
from shortener.app import app

# TestClient sem seguir redirects para inspecionar o 302 diretamente.
client = TestClient(app, follow_redirects=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def isolate():
    """Limpa storage e analytics antes/depois de cada teste."""
    storage.clear()
    repo = AnalyticsRepository()
    repo.limpar()
    yield
    storage.clear()
    repo.limpar()


@pytest.fixture()
def repo() -> AnalyticsRepository:
    """Repositorio limpo para uso direto nos testes de unidade."""
    r = AnalyticsRepository()
    r.limpar()
    return r


def _criar_link(url: str = "https://example.com") -> str:
    """Cria um link encurtado via POST /shorten e retorna o codigo."""
    resp = TestClient(app).post("/shorten", json={"url": url})
    assert resp.status_code == 201
    return resp.json()["code"]


# ---------------------------------------------------------------------------
# Cenario A -- Acesso a codigo valido -> evento link_acessado registrado
# ---------------------------------------------------------------------------

class TestCenarioA:
    def test_evento_link_acessado_registrado_apos_redirect(self, repo):
        code = _criar_link("https://example.com")
        resp = client.get(f"/{code}")
        assert resp.status_code == 302
        # BackgroundTasks do TestClient sao executadas de forma sincrona.
        assert repo.contar_cliques(code) == 1

    def test_evento_contem_codigo_correto(self, repo):
        code = _criar_link("https://example.com/path")
        client.get(f"/{code}")
        assert repo.contar_cliques(code) == 1

    def test_evento_link_acessado_com_headers(self, repo):
        """Referrer e user-agent extraidos dos headers do request."""
        code = _criar_link()
        client.get(
            f"/{code}",
            headers={"Referer": "https://google.com", "User-Agent": "TestBot/1.0"},
        )
        assert repo.contar_cliques(code) == 1


# ---------------------------------------------------------------------------
# Cenario B -- Acesso a codigo inexistente -> evento link_nao_encontrado
# ---------------------------------------------------------------------------

class TestCenarioB:
    def test_404_retornado(self):
        resp = client.get("/naoexiste")
        assert resp.status_code == 404

    def test_evento_link_nao_encontrado_registrado(self):
        client.get("/naoexiste")
        conn = sqlite3.connect(_DB_NAME, uri=True, check_same_thread=False)
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM eventos_analytics "
            "WHERE tipo_evento='link_nao_encontrado' AND codigo=?",
            ("naoexiste",),
        )
        count = cur.fetchone()[0]
        conn.close()
        assert count == 1

    def test_evento_nao_encontrado_codigo_correto(self):
        client.get("/codigoinvalido")
        conn = sqlite3.connect(_DB_NAME, uri=True, check_same_thread=False)
        cur = conn.cursor()
        cur.execute(
            "SELECT codigo FROM eventos_analytics WHERE tipo_evento='link_nao_encontrado'",
        )
        rows = [r[0] for r in cur.fetchall()]
        conn.close()
        assert "codigoinvalido" in rows


# ---------------------------------------------------------------------------
# Cenario C -- N acessos validos -> contar_cliques == N (COUNT derivado)
# ---------------------------------------------------------------------------

class TestCenarioC:
    @pytest.mark.parametrize("n", [1, 3, 5, 10])
    def test_contar_cliques_igual_a_n_acessos(self, repo, n):
        code = _criar_link()
        for _ in range(n):
            client.get(f"/{code}")
        assert repo.contar_cliques(code) == n

    def test_contagem_independente_por_codigo(self, repo):
        code_a = _criar_link("https://a.com")
        code_b = _criar_link("https://b.com")
        client.get(f"/{code_a}")
        client.get(f"/{code_a}")
        client.get(f"/{code_b}")
        assert repo.contar_cliques(code_a) == 2
        assert repo.contar_cliques(code_b) == 1

    def test_contar_cliques_zero_sem_acessos(self, repo):
        code = _criar_link()
        assert repo.contar_cliques(code) == 0

    def test_contar_cliques_nao_inclui_nao_encontrado(self, repo):
        """Eventos link_nao_encontrado NAO entram na contagem de cliques."""
        client.get("/codigo_inexistente")
        assert repo.contar_cliques("codigo_inexistente") == 0


# ---------------------------------------------------------------------------
# Cenario D -- Falha no analytics -> redirect 302 normal (sem erro 500)
#
# O AnalyticsService ja suprime excecoes internamente. Para testar que
# MESMO uma falha catastrofica (ex.: erro no repo que o service nao
# conseguiu tratar) nao afeta o visitante, patcheamos o metodo do repo
# que e chamado internamente pelo service -- e o wrapper no app.py garante
# que qualquer excecao remanescente tambem e suprimida.
# ---------------------------------------------------------------------------

class TestCenarioD:
    def test_falha_analytics_nao_retorna_500(self):
        """Mesmo que o repositorio de analytics lance excecao, o 302 ocorre normalmente."""
        code = _criar_link()
        with patch(
            "shortener.analytics.repository.AnalyticsRepository.registrar_link_acessado",
            side_effect=RuntimeError("banco fora do ar"),
        ):
            resp = client.get(f"/{code}")
        assert resp.status_code == 302

    def test_falha_analytics_nao_encontrado_nao_retorna_500(self):
        """Mesmo que o analytics falhe no 404, o 404 original e retornado."""
        with patch(
            "shortener.analytics.repository.AnalyticsRepository.registrar_link_nao_encontrado",
            side_effect=RuntimeError("banco fora do ar"),
        ):
            resp = client.get("/naoexiste")
        assert resp.status_code == 404

    def test_redirect_location_correto_mesmo_com_falha_analytics(self):
        """A Location do 302 nao e afetada por falha de analytics."""
        original = "https://destino.com"
        code = _criar_link(original)
        with patch(
            "shortener.analytics.repository.AnalyticsRepository.registrar_link_acessado",
            side_effect=Exception("falha"),
        ):
            resp = client.get(f"/{code}")
        assert resp.status_code == 302
        assert resp.headers["location"] == original


# ---------------------------------------------------------------------------
# Cenario E -- referrer e user_agent opcionais (None aceito sem erro)
# ---------------------------------------------------------------------------

class TestCenarioE:
    def test_registrar_sem_referrer_e_user_agent(self, repo):
        """registrar_link_acessado com None em ambos os campos opcionais."""
        repo.registrar_link_acessado("abc123", referrer=None, user_agent=None)
        assert repo.contar_cliques("abc123") == 1

    def test_registrar_com_apenas_referrer(self, repo):
        repo.registrar_link_acessado("xyz", referrer="https://google.com", user_agent=None)
        assert repo.contar_cliques("xyz") == 1

    def test_registrar_com_apenas_user_agent(self, repo):
        repo.registrar_link_acessado("xyz", referrer=None, user_agent="Mozilla/5.0")
        assert repo.contar_cliques("xyz") == 1

    def test_acesso_sem_headers_opcionais_nao_falha(self, repo):
        """Request sem Referer e sem User-Agent nao deve causar erro."""
        code = _criar_link()
        resp = client.get(f"/{code}", headers={})
        assert resp.status_code == 302
        assert repo.contar_cliques(code) == 1

    def test_service_aceita_none_nos_opcionais(self):
        """AnalyticsService.registrar_link_acessado aceita None sem excecao."""
        svc = AnalyticsService()
        svc.registrar_link_acessado("qualquer", referrer=None, user_agent=None)

    def test_modelo_evento_aceita_none_nos_opcionais(self):
        """EventoLinkAcessado instancia corretamente com campos opcionais None."""
        from shortener.analytics.models import EventoLinkAcessado

        ev = EventoLinkAcessado(codigo="abc", referrer=None, user_agent=None)
        assert ev.referrer is None
        assert ev.user_agent is None
        assert ev.tipo_evento == "link_acessado"


# ---------------------------------------------------------------------------
# Testes do endpoint GET /api/links/{codigo}/cliques
# ---------------------------------------------------------------------------

class TestEndpointCliques:
    def test_cliques_zero_sem_acessos(self):
        code = _criar_link()
        resp = TestClient(app).get(f"/api/links/{code}/cliques")
        assert resp.status_code == 200
        data = resp.json()
        assert data["codigo"] == code
        assert data["cliques"] == 0

    def test_cliques_reflete_acessos(self):
        code = _criar_link()
        client.get(f"/{code}")
        client.get(f"/{code}")
        resp = TestClient(app).get(f"/api/links/{code}/cliques")
        assert resp.status_code == 200
        assert resp.json()["cliques"] == 2
