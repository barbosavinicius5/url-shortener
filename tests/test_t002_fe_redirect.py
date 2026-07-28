"""Testes BDD — t002: experiência do consumidor de API (redirecionamento e erro HTML).

Cobre os 3 cenários definidos na task t002-fe-redirecionamento-e-erro-link:

  Cenário A — GET /{codigo_existente}  → 302 com Location correto, sem tela intermediária.
  Cenário B — GET /{codigo_inexistente} → 404 com HTML "link não encontrado", sem redirect.
  Cenário C — Ambos os cenários funcionam sem autenticação (sem headers de auth).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.app import app

# follow_redirects=False: permite inspecionar o 302 antes de o cliente segui-lo.
client = TestClient(app, follow_redirects=False)


# ---------------------------------------------------------------------------
# Fixture de isolamento
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _limpar_storage():
    """Garante store limpo antes e depois de cada teste."""
    storage.clear()
    yield
    storage.clear()


def _encurtar(url: str = "https://exemplo.com") -> str:
    """Cria um mapeamento via POST /shorten e retorna o código gerado."""
    resp = TestClient(app).post("/shorten", json={"url": url})
    assert resp.status_code == 201, f"Falha ao criar código: {resp.text}"
    return resp.json()["code"]


# ---------------------------------------------------------------------------
# Cenário A — Redirecionamento transparente para código existente
# ---------------------------------------------------------------------------

class TestCenarioA_RedirecionamentoTransparente:
    """Dado um código existente no banco,
    quando GET /{codigo} é chamado sem autenticação,
    então o servidor responde 302 com header Location correto,
    sem exibir qualquer tela intermediária.
    """

    def test_status_302(self):
        """Cenário A: resposta deve ser HTTP 302 Found."""
        code = _encurtar("https://exemplo.com")
        resp = client.get(f"/{code}")
        assert resp.status_code == 302

    def test_header_location_correto(self):
        """Cenário A: Location aponta para a URL original cadastrada."""
        destino = "https://exemplo.com/pagina?ref=campanha"
        code = _encurtar(destino)
        resp = client.get(f"/{code}")
        assert resp.headers["location"] == destino

    def test_sem_tela_intermediaria(self):
        """Cenário A: resposta 302 não contém formulário ou página de confirmação."""
        code = _encurtar("https://exemplo.com")
        resp = client.get(f"/{code}")
        assert resp.status_code == 302
        # Nenhum HTML de "você será redirecionado" ou formulário de confirmação.
        assert "<form" not in resp.text.lower()
        assert "confirmar" not in resp.text.lower()
        assert "clique aqui" not in resp.text.lower()

    def test_browser_segue_redirect_automaticamente(self):
        """Cenário A: ao seguir o redirect, o cliente chega à URL de destino."""
        destino = "https://httpbin.org/get"
        code = _encurtar(destino)
        # Com follow_redirects=True o TestClient seguiria o redirect normalmente.
        # Verificamos apenas que o Location está correto para o browser seguir.
        resp = client.get(f"/{code}")
        assert resp.status_code == 302
        assert resp.headers.get("location") == destino

    def test_redirect_para_url_http(self):
        """Cenário A: funciona também para destinos http:// (não só https://)."""
        destino = "http://exemplo.com/pagina-legada"
        code = _encurtar(destino)
        resp = client.get(f"/{code}")
        assert resp.status_code == 302
        assert resp.headers["location"] == destino


# ---------------------------------------------------------------------------
# Cenário B — Página "link não encontrado" para código inexistente
# ---------------------------------------------------------------------------

class TestCenarioB_LinkNaoEncontrado:
    """Dado um código que NÃO existe no banco,
    quando GET /{codigo} é chamado sem autenticação,
    então o servidor responde 404 com HTML amigável de "link não encontrado",
    sem redirecionar e sem expor detalhes técnicos.
    """

    def test_status_404(self):
        """Cenário B: resposta deve ser HTTP 404 Not Found."""
        resp = client.get("/abcdef")
        assert resp.status_code == 404

    def test_sem_redirecionamento(self):
        """Cenário B: não deve haver header Location na resposta de erro."""
        resp = client.get("/abcdef")
        assert "location" not in resp.headers

    def test_resposta_html(self):
        """Cenário B: content-type deve ser text/html."""
        resp = client.get("/abcdef")
        assert "text/html" in resp.headers.get("content-type", "")

    def test_mensagem_link_nao_encontrado(self):
        """Cenário B: corpo HTML contém 'link não encontrado'."""
        resp = client.get("/abcdef")
        assert "link não encontrado" in resp.text.lower()

    def test_mensagem_explicativa(self):
        """Cenário B: corpo HTML contém mensagem explicativa ao usuário."""
        resp = client.get("/abcdef")
        body = resp.text.lower()
        # A mensagem deve indicar que o link não existe ou foi removido.
        assert "não existe" in body or "foi removido" in body or "não encontrado" in body

    def test_sem_stack_trace(self):
        """Cenário B: HTML não expõe stack trace."""
        resp = client.get("/abcdef")
        assert "traceback" not in resp.text.lower()

    def test_sem_detalhes_internos(self):
        """Cenário B: HTML não expõe mensagens técnicas internas."""
        resp = client.get("/abcdef")
        body = resp.text.lower()
        assert "exception" not in body
        assert "short code not found" not in body
        assert "internal server error" not in body

    def test_html_semantico_tem_titulo(self):
        """Cenário B: página HTML possui elemento <title> adequado."""
        resp = client.get("/abcdef")
        assert "<title>" in resp.text.lower()

    def test_codigo_diferente_tambem_retorna_404_html(self):
        """Cenário B: qualquer código inexistente retorna 404 HTML."""
        for code in ["xxxxxx", "zzzzzz", "000000"]:
            resp = client.get(f"/{code}")
            assert resp.status_code == 404
            assert "text/html" in resp.headers.get("content-type", "")


# ---------------------------------------------------------------------------
# Cenário C — Acesso público sem autenticação
# ---------------------------------------------------------------------------

class TestCenarioC_AcessoPublico:
    """Dado qualquer usuário não autenticado (sem headers de auth),
    quando GET /{codigo} é chamado,
    então ambos os fluxos (existente e inexistente) funcionam sem exigir login.
    """

    def test_redirect_sem_auth_header(self):
        """Cenário C: código existente redireciona sem Authorization header."""
        destino = "https://exemplo.com"
        code = _encurtar(destino)

        # Requisição explicitamente sem header de Authorization.
        resp = client.get(f"/{code}", headers={})
        assert resp.status_code == 302
        assert resp.headers["location"] == destino

    def test_erro_sem_auth_header(self):
        """Cenário C: código inexistente retorna 404 HTML sem Authorization header."""
        resp = client.get("/abcdef", headers={})
        assert resp.status_code == 404
        assert "text/html" in resp.headers.get("content-type", "")

    def test_nao_retorna_401(self):
        """Cenário C: rota não exige auth — nunca retorna 401 Unauthorized."""
        code = _encurtar("https://exemplo.com")
        assert client.get(f"/{code}").status_code != 401

    def test_nao_retorna_403(self):
        """Cenário C: rota não exige auth — nunca retorna 403 Forbidden."""
        code = _encurtar("https://exemplo.com")
        assert client.get(f"/{code}").status_code != 403

    def test_inexistente_nao_retorna_401(self):
        """Cenário C: código inexistente não resulta em 401."""
        assert client.get("/abcdef").status_code != 401

    def test_inexistente_nao_retorna_403(self):
        """Cenário C: código inexistente não resulta em 403."""
        assert client.get("/abcdef").status_code != 403

    def test_com_bearer_token_invalido_ainda_redireciona(self):
        """Cenário C: mesmo com token inválido no header, o redirect funciona.

        A rota é pública e não valida tokens — um header Authorization qualquer
        não deve causar rejeição.
        """
        code = _encurtar("https://exemplo.com")
        resp = client.get(
            f"/{code}",
            headers={"Authorization": "Bearer token-invalido"},
        )
        # Rota pública: ignora o header e redireciona normalmente.
        assert resp.status_code == 302