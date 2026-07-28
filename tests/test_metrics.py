"""Testes BDD — endpoint GET /metrics (métrica clicks_total).

Cenário A — GET /metrics retorna clicks_total com valor correto.
Cenário B — Após redirect bem-sucedido, clicks_total incrementa.
Cenário C — Redirect com short_code inexistente NÃO incrementa clicks_total.
Cenário D — Valor em /metrics é coerente com a contagem persistida no DB.
"""

import pytest
from fastapi.testclient import TestClient

from app.events import clear_events
from app.main import app
from app.models import Link
from tests.conftest import TestSessionFactory

# TestClient sem seguir redirects: inspecionamos o 302 diretamente.
client = TestClient(app, follow_redirects=False)
# Client que segue redirects (não é necessário aqui, mas documentado).
client_follow = TestClient(app, follow_redirects=True)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def limpar_estado():
    """Limpa tabela e eventos antes e após cada teste para isolamento total."""
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _criar_link(url: str = "https://exemplo.com") -> str:
    """Cria um link via POST /shorten e retorna o código curto."""
    resp = TestClient(app).post("/shorten", json={"url": url})
    assert resp.status_code == 201, resp.json()
    return resp.json()["codigo"]


def _get_cliques_db(codigo: str) -> int:
    """Lê o campo ``cliques`` diretamente do banco de testes."""
    db = TestSessionFactory()
    link = db.query(Link).filter(Link.codigo == codigo).first()
    db.close()
    return link.cliques if link else 0


def _get_clicks_total() -> int:
    """Chama GET /metrics e retorna o valor de clicks_total."""
    resp = TestClient(app).get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "clicks_total" in data
    return int(data["clicks_total"])


# ---------------------------------------------------------------------------
# Cenário A — GET /metrics retorna clicks_total com valor correto
# ---------------------------------------------------------------------------


class TestCenarioA:
    def test_a1_metrics_retorna_200(self):
        """GET /metrics deve responder HTTP 200."""
        resp = TestClient(app).get("/metrics")
        assert resp.status_code == 200

    def test_a2_metrics_retorna_json_com_clicks_total(self):
        """Corpo de GET /metrics deve conter a chave 'clicks_total'."""
        resp = TestClient(app).get("/metrics")
        data = resp.json()
        assert "clicks_total" in data

    def test_a3_clicks_total_zero_sem_acessos(self):
        """Com banco vazio, clicks_total deve ser 0."""
        total = _get_clicks_total()
        assert total == 0

    def test_a4_clicks_total_reflete_cliques_persistidos(self):
        """clicks_total deve refletir a soma dos cliques já no DB."""
        # Cria link e popula cliques diretamente no banco (sem passar pela rota).
        codigo = _criar_link("https://direto.com")
        db = TestSessionFactory()
        link = db.query(Link).filter(Link.codigo == codigo).first()
        link.cliques = 7  # type: ignore[assignment]
        db.commit()
        db.close()

        total = _get_clicks_total()
        assert total == 7

    def test_a5_clicks_total_soma_multiplos_links(self):
        """clicks_total deve somar os cliques de todos os links no banco."""
        for i in range(3):
            codigo = _criar_link(f"https://multi-{i}.com")
            db = TestSessionFactory()
            link = db.query(Link).filter(Link.codigo == codigo).first()
            link.cliques = (
                i + 1
            ) * 2  # 2, 4, 6 → total = 12  # type: ignore[assignment]
            db.commit()
            db.close()

        total = _get_clicks_total()
        assert total == 12  # 2 + 4 + 6

    def test_a6_content_type_json(self):
        """Content-Type de GET /metrics deve ser application/json."""
        resp = TestClient(app).get("/metrics")
        assert "application/json" in resp.headers.get("content-type", "")


# ---------------------------------------------------------------------------
# Cenário B — Após redirect bem-sucedido, clicks_total incrementa
# ---------------------------------------------------------------------------


class TestCenarioB:
    def test_b1_redirect_bem_sucedido_incrementa_clicks_total(self):
        """Após um GET /{codigo} (302), clicks_total deve ser 1."""
        codigo = _criar_link("https://destino-b1.com")
        assert _get_clicks_total() == 0

        client.get(f"/{codigo}")  # segue o redirect sem verificar destino

        assert _get_clicks_total() == 1

    def test_b2_multiplos_redirects_acumulam_clicks_total(self):
        """Cada acesso bem-sucedido incrementa clicks_total em +1."""
        codigo = _criar_link("https://acumulado.com")
        N = 5
        for esperado in range(1, N + 1):
            client.get(f"/{codigo}")
            assert _get_clicks_total() == esperado

    def test_b3_redirects_em_links_distintos_somam_clicks_total(self):
        """clicks_total soma acessos a links distintos."""
        cod1 = _criar_link("https://link1.com")
        cod2 = _criar_link("https://link2.com")

        client.get(f"/{cod1}")
        client.get(f"/{cod2}")
        client.get(f"/{cod1}")

        assert _get_clicks_total() == 3

    def test_b4_redirect_retorna_302(self):
        """GET /{codigo} com código válido deve retornar 302."""
        codigo = _criar_link("https://checar-status.com")
        resp = client.get(f"/{codigo}")
        assert resp.status_code == 302


# ---------------------------------------------------------------------------
# Cenário C — Redirect com short_code inexistente NÃO incrementa clicks_total
# ---------------------------------------------------------------------------


class TestCenarioC:
    def test_c1_codigo_inexistente_nao_incrementa_clicks_total(self):
        """GET com código inexistente (404) NÃO deve alterar clicks_total."""
        assert _get_clicks_total() == 0

        resp = client.get("/codigofantasma")
        assert resp.status_code == 404

        assert _get_clicks_total() == 0

    def test_c2_404_nao_incrementa_apos_cliques_existentes(self):
        """clicks_total deve permanecer inalterado após um 404."""
        codigo = _criar_link("https://existente.com")
        client.get(f"/{codigo}")  # 1 clique legítimo
        assert _get_clicks_total() == 1

        client.get("/nao-existe-mesmo")  # 404
        assert _get_clicks_total() == 1  # permanece 1

    def test_c3_multiplos_404_nao_alteram_clicks_total(self):
        """Múltiplos 404 não devem acumular nada em clicks_total."""
        for _ in range(5):
            resp = client.get("/fantasma")
            assert resp.status_code == 404

        assert _get_clicks_total() == 0

    def test_c4_404_retorna_mensagem_nao_encontrado(self):
        """Corpo do 404 deve indicar que o link não foi encontrado."""
        resp = client.get("/inexistente")
        assert resp.status_code == 404
        body = resp.json()
        assert "detail" in body
        assert "encontrado" in body["detail"].lower()


# ---------------------------------------------------------------------------
# Cenário D — Coerência entre /metrics e contagem no DB
# ---------------------------------------------------------------------------


class TestCenarioD:
    def test_d1_metrics_coerente_com_soma_db(self):
        """/metrics deve retornar exatamente a soma de cliques do DB."""
        cod1 = _criar_link("https://coer1.com")
        cod2 = _criar_link("https://coer2.com")

        # Acessa os links e obtém o total via /metrics.
        client.get(f"/{cod1}")
        client.get(f"/{cod2}")
        client.get(f"/{cod1}")

        # Calcula a soma diretamente no banco.
        db = TestSessionFactory()
        links = db.query(Link).all()
        soma_db = sum(lk.cliques for lk in links)
        db.close()

        total_metrics = _get_clicks_total()
        assert total_metrics == soma_db == 3

    def test_d2_apos_redirect_db_e_metrics_consistentes(self):
        """Após cada redirect, a contagem no DB e em /metrics devem coincidir."""
        codigo = _criar_link("https://consistente.com")
        N = 4
        for i in range(1, N + 1):
            client.get(f"/{codigo}")

            cliques_db = _get_cliques_db(codigo)
            total_metrics = _get_clicks_total()

            assert cliques_db == i, f"DB: esperado {i}, obtido {cliques_db}"
            assert total_metrics == i, f"/metrics: esperado {i}, obtido {total_metrics}"

    def test_d3_banco_vazio_metrics_zero(self):
        """Com banco vazio, /metrics deve retornar 0 e o DB confirma isso."""
        db = TestSessionFactory()
        count = db.query(Link).count()
        db.close()
        assert count == 0

        total = _get_clicks_total()
        assert total == 0

    def test_d4_metrics_nao_dupla_contagem(self):
        """O mesmo acesso não deve ser contado duas vezes em /metrics."""
        codigo = _criar_link("https://noduplicate.com")

        client.get(f"/{codigo}")  # um único acesso

        total = _get_clicks_total()
        assert total == 1, f"Esperado 1, obtido {total} (possível dupla contagem)"
