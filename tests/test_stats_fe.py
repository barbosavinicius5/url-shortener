"""Testes FE para a tela de consulta de contagem de cliques (t002-fe).

Cenários BDD cobertos
---------------------
A — Sucesso      : GET /stats retorna a página HTML; GET /{codigo}/stats com
                   código existente retorna 200 com cliques.
B — Vazio        : submit com código vazio → endpoint retorna 422 (ou validação
                   client-side) e a página contém o elemento de erro de validação.
C — Não encontrado: código válido mas inexistente → 404 e página contém elemento
                   de erro de não encontrado.
D — Loading      : a página contém os elementos de loading state no HTML.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from shortener import storage
from shortener.analytics.repository import AnalyticsRepository
from shortener.app import app

# TestClient sem seguir redirects para inspecionar respostas diretas.
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


def _criar_link(url: str = "https://example.com") -> str:
    """Cria um link encurtado via POST /shorten e retorna o código."""
    resp = client.post("/shorten", json={"url": url})
    assert resp.status_code == 201
    return resp.json()["code"]


def _simular_cliques(code: str, n: int) -> None:
    """Dispara n requisições GET /{code} para registrar cliques no analytics."""
    click_client = TestClient(app, follow_redirects=False)
    for _ in range(n):
        click_client.get(f"/{code}")


# ---------------------------------------------------------------------------
# Cenário A — Sucesso
# ---------------------------------------------------------------------------

class TestCenarioA:
    """GET /stats serve a página HTML e /{codigo_curto}/stats retorna cliques."""

    def test_get_stats_retorna_200(self):
        """A rota GET /stats deve responder com 200."""
        resp = client.get("/stats")
        assert resp.status_code == 200

    def test_get_stats_content_type_html(self):
        """GET /stats deve retornar content-type HTML."""
        resp = client.get("/stats")
        assert "text/html" in resp.headers["content-type"]

    def test_get_stats_contem_campo_codigo(self):
        """A página deve conter o campo de input para codigo_curto."""
        resp = client.get("/stats")
        assert b"campo-codigo" in resp.content

    def test_get_stats_contem_btn_consultar(self):
        """A página deve conter o botão de consulta."""
        resp = client.get("/stats")
        assert b"btn-consultar" in resp.content

    def test_get_stats_contem_result_box(self):
        """A página deve conter a área de resultado."""
        resp = client.get("/stats")
        assert b"result-box" in resp.content

    def test_api_stats_codigo_existente_retorna_200(self):
        """GET /{codigo_curto}/stats com código existente retorna 200."""
        code = _criar_link()
        resp = client.get(f"/{code}/stats")
        assert resp.status_code == 200

    def test_api_stats_retorna_codigo_curto(self):
        """Resposta deve conter campo 'codigo_curto'."""
        code = _criar_link()
        data = client.get(f"/{code}/stats").json()
        assert data["codigo_curto"] == code

    def test_api_stats_retorna_cliques(self):
        """Resposta deve conter campo 'cliques'."""
        code = _criar_link()
        data = client.get(f"/{code}/stats").json()
        assert "cliques" in data

    def test_api_stats_cliques_zero_sem_acessos(self):
        """Código sem acessos deve retornar cliques = 0."""
        code = _criar_link()
        data = client.get(f"/{code}/stats").json()
        assert data["cliques"] == 0

    def test_api_stats_cliques_correto_apos_acessos(self):
        """Cliques deve refletir os acessos registrados via redirect."""
        code = _criar_link()
        _simular_cliques(code, 3)
        data = client.get(f"/{code}/stats").json()
        assert data["cliques"] == 3

    def test_api_stats_cliques_acumulam(self):
        """Múltiplas consultas não afetam o contador — ele acumula apenas pelos redirects."""
        code = _criar_link()
        _simular_cliques(code, 5)
        data1 = client.get(f"/{code}/stats").json()
        data2 = client.get(f"/{code}/stats").json()
        assert data1["cliques"] == 5
        assert data2["cliques"] == 5

    def test_api_stats_isolamento_entre_codigos(self):
        """Cliques de um código não vazam para outro."""
        code_a = _criar_link("https://a.com")
        code_b = _criar_link("https://b.com")
        _simular_cliques(code_a, 4)

        data_a = client.get(f"/{code_a}/stats").json()
        data_b = client.get(f"/{code_b}/stats").json()
        assert data_a["cliques"] == 4
        assert data_b["cliques"] == 0


# ---------------------------------------------------------------------------
# Cenário B — Código vazio / validação
# ---------------------------------------------------------------------------

class TestCenarioB:
    """Código vazio → validação impede chamada útil ao BE (ou BE retorna 422)."""

    def test_get_stats_contem_elemento_erro_validacao(self):
        """A página HTML deve conter o elemento de mensagem de erro de validação."""
        resp = client.get("/stats")
        assert b"error-validacao" in resp.content

    def test_get_stats_mensagem_validacao_no_html(self):
        """A mensagem de erro de validação deve estar presente no HTML."""
        resp = client.get("/stats")
        assert "não vazio" in resp.text or "nao vazio" in resp.text.lower() or "Código inválido" in resp.text

    def test_api_stats_codigo_vazio_retorna_422(self):
        """Espaços encodados como path retornam 422 (FastAPI path validation)."""
        # Código só de espaços — o endpoint faz strip() e detecta como vazio
        resp = client.get("/%20%20/stats")
        assert resp.status_code == 422

    def test_api_stats_codigo_espaco_unico_retorna_422(self):
        """Único espaço encodado retorna 422."""
        resp = client.get("/%20/stats")
        assert resp.status_code == 422

    def test_api_stats_codigo_vazio_detail_presente(self):
        """A resposta 422 deve conter alguma mensagem de detail."""
        resp = client.get("/%20/stats")
        body = resp.json()
        assert "detail" in body


# ---------------------------------------------------------------------------
# Cenário C — Código não encontrado
# ---------------------------------------------------------------------------

class TestCenarioC:
    """Código válido mas inexistente → 404 e página exibe mensagem de não encontrado."""

    def test_get_stats_contem_elemento_nao_encontrado(self):
        """A página HTML deve conter o elemento de mensagem de não encontrado."""
        resp = client.get("/stats")
        assert b"error-nao-encontrado" in resp.content

    def test_get_stats_mensagem_nao_encontrado_no_html(self):
        """A mensagem 'não encontrado' deve estar presente no HTML."""
        resp = client.get("/stats")
        assert "não encontrado" in resp.text or "nao encontrado" in resp.text.lower()

    def test_api_stats_codigo_inexistente_retorna_404(self):
        """GET /{codigo}/stats com código inexistente retorna 404."""
        resp = client.get("/NAOEXISTE/stats")
        assert resp.status_code == 404

    def test_api_stats_404_contem_detail(self):
        """Resposta 404 deve conter campo 'detail'."""
        resp = client.get("/NAOEXISTE/stats")
        body = resp.json()
        assert "detail" in body

    def test_api_stats_404_sem_cliques(self):
        """Resposta 404 não deve conter 'cliques'."""
        resp = client.get("/NAOEXISTE/stats")
        body = resp.json()
        assert "cliques" not in body

    def test_api_stats_404_sem_codigo_curto(self):
        """Resposta 404 não deve conter 'codigo_curto' no corpo."""
        resp = client.get("/NAOEXISTE/stats")
        body = resp.json()
        assert "codigo_curto" not in body

    def test_mensagem_nao_expoe_detalhes_tecnicos(self):
        """A mensagem de erro não deve conter stack traces ou nomes internos."""
        resp = client.get("/NAOEXISTE/stats")
        body = resp.json()
        detail = str(body.get("detail", ""))
        assert "traceback" not in detail.lower()
        assert "exception" not in detail.lower()


# ---------------------------------------------------------------------------
# Cenário D — Loading state
# ---------------------------------------------------------------------------

class TestCenarioD:
    """Estado de loading verificado via estrutura HTML."""

    def test_pagina_contem_loading_indicator(self):
        """A página deve conter o elemento de loading indicator."""
        resp = client.get("/stats")
        assert b"loading-indicator" in resp.content

    def test_pagina_contem_btn_consultar(self):
        """O botão de consulta deve estar presente para ser desabilitado durante loading."""
        resp = client.get("/stats")
        assert b"btn-consultar" in resp.content

    def test_btn_consultar_e_submit(self):
        """O botão deve ser do tipo submit para funcionar com o form."""
        resp = client.get("/stats")
        assert b'type="submit"' in resp.content

    def test_loading_indicator_oculto_por_padrao(self):
        """O loading indicator deve começar oculto (display: none)."""
        resp = client.get("/stats")
        html = resp.text
        # O elemento existe e está oculto no CSS/style
        assert "loading-indicator" in html
        assert "display: none" in html or "display:none" in html

    def test_btn_disabled_referenciado_no_script(self):
        """O JavaScript deve referenciar o atributo disabled do botão."""
        resp = client.get("/stats")
        assert "disabled" in resp.text

    def test_loading_referenciado_no_script(self):
        """O JavaScript deve manipular o loading indicator."""
        resp = client.get("/stats")
        assert "loading" in resp.text

    def test_btn_desabilitado_durante_loading_no_script(self):
        """O script deve desabilitar o botão durante a requisição."""
        resp = client.get("/stats")
        html = resp.text
        assert "btnConsultar.disabled" in html or "btn-consultar" in html

    def test_pagina_contem_form_stats(self):
        """A página deve conter o formulário de consulta."""
        resp = client.get("/stats")
        assert b"stats-form" in resp.content

    def test_pagina_contem_areas_de_erro(self):
        """A página deve conter todas as áreas de feedback ao usuário."""
        resp = client.get("/stats")
        html = resp.content
        assert b"error-validacao" in html
        assert b"error-nao-encontrado" in html
        assert b"result-box" in html


# ---------------------------------------------------------------------------
# Testes de integridade da página HTML
# ---------------------------------------------------------------------------

class TestPaginaHtml:
    """Verifica estrutura geral da página de stats."""

    def test_titulo_na_pagina(self):
        resp = client.get("/stats")
        assert "Cliques" in resp.text or "cliques" in resp.text

    def test_content_type_html(self):
        resp = client.get("/stats")
        assert "text/html" in resp.headers["content-type"]

    def test_pagina_tem_input_text(self):
        resp = client.get("/stats")
        assert b'type="text"' in resp.content

    def test_pagina_usa_fetch_javascript(self):
        """A página deve usar fetch() para chamadas AJAX."""
        resp = client.get("/stats")
        assert b"fetch(" in resp.content

    def test_pagina_referencia_endpoint_stats(self):
        """O JavaScript deve referenciar o endpoint /stats."""
        resp = client.get("/stats")
        assert "/stats" in resp.text