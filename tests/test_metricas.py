"""Tests for GET /metricas/{codigo} endpoint and GET /metricas UI (t002).

BDD cenários cobertos
---------------------
A — Dados presentes       : 200, total_cliques > 0, dados_acesso preenchido
B — Zero acessos          : 200, total_cliques = 0, dados_acesso vazio
C — Código não encontrado : 404, erro = "codigo_nao_encontrado"
D — Entrada inválida      : endpoint com espaços/vazio → 400 (cliente valida antes do envio,
                            mas o endpoint também protege)
E — Isolamento de dados   : consulta a código B não exibe dados do código A
"""

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.app import app

client = TestClient(app, follow_redirects=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_storage():
    """Reset in-memory store before and after every test."""
    storage.clear()
    yield
    storage.clear()


def _criar_codigo(url: str = "https://example.com") -> str:
    """Cria um código curto via POST /shorten e retorna o code."""
    resp = client.post("/shorten", json={"url": url})
    assert resp.status_code == 201
    return resp.json()["code"]


def _simular_acessos(code: str, n: int) -> None:
    """Dispara n requisições GET /{code} (sem seguir redirects) para incrementar contadores."""
    redirect_client = TestClient(app, follow_redirects=False)
    for _ in range(n):
        redirect_client.get(f"/{code}")


# ---------------------------------------------------------------------------
# Cenário A — Dados presentes
# ---------------------------------------------------------------------------

class TestCenarioA:
    """GET /metricas/{codigo} quando o código tem acessos registrados."""

    def test_retorna_200(self):
        code = _criar_codigo()
        _simular_acessos(code, 3)
        resp = client.get(f"/metricas/{code}")
        assert resp.status_code == 200

    def test_total_cliques_correto(self):
        code = _criar_codigo()
        _simular_acessos(code, 5)
        data = client.get(f"/metricas/{code}").json()
        assert data["total_cliques"] == 5

    def test_dados_acesso_preenchido(self):
        code = _criar_codigo()
        _simular_acessos(code, 2)
        data = client.get(f"/metricas/{code}").json()
        assert len(data["dados_acesso"]) == 2

    def test_cada_dado_acesso_tem_acessado_em(self):
        code = _criar_codigo()
        _simular_acessos(code, 1)
        data = client.get(f"/metricas/{code}").json()
        assert "acessado_em" in data["dados_acesso"][0]

    def test_codigo_retornado_na_resposta(self):
        code = _criar_codigo()
        _simular_acessos(code, 1)
        data = client.get(f"/metricas/{code}").json()
        assert data["codigo"] == code

    def test_acessado_em_formato_iso(self):
        """Cada timestamp deve terminar em 'Z' (UTC ISO-8601)."""
        code = _criar_codigo()
        _simular_acessos(code, 1)
        data = client.get(f"/metricas/{code}").json()
        ts = data["dados_acesso"][0]["acessado_em"]
        assert ts.endswith("Z"), f"Timestamp inesperado: {ts}"


# ---------------------------------------------------------------------------
# Cenário B — Zero acessos
# ---------------------------------------------------------------------------

class TestCenarioB:
    """GET /metricas/{codigo} quando o código existe mas nunca foi acessado."""

    def test_retorna_200(self):
        code = _criar_codigo()
        resp = client.get(f"/metricas/{code}")
        assert resp.status_code == 200

    def test_total_cliques_zero(self):
        code = _criar_codigo()
        data = client.get(f"/metricas/{code}").json()
        assert data["total_cliques"] == 0

    def test_dados_acesso_lista_vazia(self):
        code = _criar_codigo()
        data = client.get(f"/metricas/{code}").json()
        assert data["dados_acesso"] == []

    def test_codigo_retornado_na_resposta(self):
        code = _criar_codigo()
        data = client.get(f"/metricas/{code}").json()
        assert data["codigo"] == code


# ---------------------------------------------------------------------------
# Cenário C — Código não encontrado
# ---------------------------------------------------------------------------

class TestCenarioC:
    """GET /metricas/{codigo} quando o código não existe no sistema."""

    def test_retorna_404(self):
        resp = client.get("/metricas/NAOEXISTE")
        assert resp.status_code == 404

    def test_erro_codigo_nao_encontrado(self):
        body = client.get("/metricas/NAOEXISTE").json()
        assert body["detail"]["erro"] == "codigo_nao_encontrado"

    def test_mensagem_legivel(self):
        body = client.get("/metricas/NAOEXISTE").json()
        assert "mensagem" in body["detail"]
        assert len(body["detail"]["mensagem"]) > 0

    def test_sem_campos_de_metricas(self):
        """Resposta 404 não deve conter total_cliques nem dados_acesso."""
        body = client.get("/metricas/NAOEXISTE").json()
        assert "total_cliques" not in body
        assert "dados_acesso" not in body


# ---------------------------------------------------------------------------
# Cenário D — Entrada inválida (código em branco / apenas espaços)
# ---------------------------------------------------------------------------

class TestCenarioD:
    """Endpoint retorna 400 quando o código é composto apenas de espaços.

    O cliente HTML valida antes do envio; o endpoint protege como segunda camada.
    Como o FastAPI trata '   ' como path segment, testamos via path encoding.
    """

    def test_codigo_so_espacos_retorna_400(self):
        # URL-encode: espaço → %20
        resp = client.get("/metricas/%20%20%20")
        assert resp.status_code == 400

    def test_erro_codigo_invalido(self):
        body = client.get("/metricas/%20").json()
        assert body["detail"]["erro"] == "codigo_invalido"

    def test_mensagem_legivel(self):
        body = client.get("/metricas/%20").json()
        assert "mensagem" in body["detail"]
        assert len(body["detail"]["mensagem"]) > 0


# ---------------------------------------------------------------------------
# Cenário E — Isolamento de dados
# ---------------------------------------------------------------------------

class TestCenarioE:
    """Consultar um segundo código não deve misturar dados do primeiro."""

    def test_codigos_independentes_total_cliques(self):
        code_a = _criar_codigo("https://a.com")
        code_b = _criar_codigo("https://b.com")

        _simular_acessos(code_a, 4)
        _simular_acessos(code_b, 1)

        data_a = client.get(f"/metricas/{code_a}").json()
        data_b = client.get(f"/metricas/{code_b}").json()

        assert data_a["total_cliques"] == 4
        assert data_b["total_cliques"] == 1

    def test_codigos_independentes_dados_acesso(self):
        code_a = _criar_codigo("https://a.com")
        code_b = _criar_codigo("https://b.com")

        _simular_acessos(code_a, 3)
        # code_b não é acessado

        data_a = client.get(f"/metricas/{code_a}").json()
        data_b = client.get(f"/metricas/{code_b}").json()

        assert len(data_a["dados_acesso"]) == 3
        assert len(data_b["dados_acesso"]) == 0

    def test_metricas_codigo_a_nao_contem_codigo_b(self):
        code_a = _criar_codigo("https://a.com")
        code_b = _criar_codigo("https://b.com")
        _simular_acessos(code_b, 2)

        data_a = client.get(f"/metricas/{code_a}").json()

        assert data_a["codigo"] == code_a
        assert data_a["total_cliques"] == 0

    def test_acessos_acumulados_corretamente_apos_mais_acessos(self):
        code = _criar_codigo()
        _simular_acessos(code, 2)
        _simular_acessos(code, 3)

        data = client.get(f"/metricas/{code}").json()
        assert data["total_cliques"] == 5
        assert len(data["dados_acesso"]) == 5


# ---------------------------------------------------------------------------
# UI — rota GET /metricas (HTML)
# ---------------------------------------------------------------------------

class TestMetricasUI:
    """Verifica que a rota da tela de métricas retorna HTML válido."""

    def test_rota_metricas_retorna_200(self):
        resp = client.get("/metricas")
        assert resp.status_code == 200

    def test_content_type_html(self):
        resp = client.get("/metricas")
        assert "text/html" in resp.headers["content-type"]

    def test_pagina_contem_campo_codigo(self):
        resp = client.get("/metricas")
        assert "campo-codigo" in resp.text

    def test_pagina_contem_btn_consultar(self):
        resp = client.get("/metricas")
        assert "btn-consultar" in resp.text

    def test_pagina_contem_titulo(self):
        resp = client.get("/metricas")
        assert "Consulta de Métricas" in resp.text

    def test_pagina_referencia_endpoint_metricas(self):
        """O JavaScript deve referenciar /metricas/ para fazer as requisições."""
        resp = client.get("/metricas")
        assert "/metricas/" in resp.text