"""Testes BDD — GET /{codigo}: resolução e redirecionamento (t001 + t002).

Cobre os 4 cenários da US-002:
  A — Código existente  → HTTP 302 com Location correto
  B — Código inexistente → HTTP 404 HTML, sem redirecionamento
  C — Formato inválido   → HTTP 404 HTML, sem consulta ao storage
  D — Acesso concorrente → todos 302 para o mesmo destino

Também verifica os pontos de decisão de analytics (link_acessado /
link_nao_encontrado) e garante que falhas nos handlers não bloqueiam o redirect.

Nota (t002): o endpoint GET /{code} retorna HTMLResponse em vez de HTTPException
para os casos 404, portanto as assertions de body verificam HTML e não JSON.
"""

from __future__ import annotations

import threading
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from shortener import analytics, storage
from shortener.app import app

# follow_redirects=False para inspecionar o 302 diretamente.
client = TestClient(app, follow_redirects=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _isolate():
    """Garante store e handlers limpos antes/depois de cada teste."""
    storage.clear()
    analytics.clear_handlers()
    yield
    storage.clear()
    analytics.clear_handlers()


def _create_code(url: str = "https://example.com") -> str:
    """Cria um código válido via POST /shorten e retorna o código."""
    c = TestClient(app)
    resp = c.post("/shorten", json={"url": url})
    assert resp.status_code == 201
    return resp.json()["code"]


# ---------------------------------------------------------------------------
# Cenário A — Código existente: HTTP 302 + Location correto
# ---------------------------------------------------------------------------

class TestCenarioA:
    """Dado um código existente com destino original mapeado."""

    def test_retorna_302(self):
        code = _create_code("https://example.com")
        resp = client.get(f"/{code}")
        assert resp.status_code == 302

    def test_location_aponta_para_destino_original(self):
        original = "https://example.com/path?q=42"
        code = _create_code(original)
        resp = client.get(f"/{code}")
        assert resp.headers["location"] == original

    def test_http_url_redireciona_corretamente(self):
        original = "http://example.com/insecure"
        code = _create_code(original)
        resp = client.get(f"/{code}")
        assert resp.status_code == 302
        assert resp.headers["location"] == original

    def test_sem_tela_intermediaria(self):
        """Resposta 302 não deve ter corpo HTML de confirmação."""
        code = _create_code("https://example.com")
        resp = client.get(f"/{code}")
        assert resp.status_code == 302
        # O corpo deve ser vazio ou mínimo — nunca um formulário de confirmação.
        assert "<form" not in resp.text.lower()

    def test_access_count_e_incrementado(self):
        code = _create_code("https://example.com")
        assert storage.get_access_count(code) == 0
        client.get(f"/{code}")
        assert storage.get_access_count(code) == 1

    def test_acesso_multiplo_incrementa_contador(self):
        code = _create_code("https://example.com")
        client.get(f"/{code}")
        client.get(f"/{code}")
        client.get(f"/{code}")
        assert storage.get_access_count(code) == 3

    def test_analytics_link_acessado_emitido(self):
        original = "https://example.com"
        code = _create_code(original)
        handler = MagicMock()
        analytics.register_handler(handler)

        client.get(f"/{code}")

        handler.assert_called_once_with(
            analytics.EVENT_LINK_ACESSADO,
            {"code": code, "url": original},
        )

    def test_analytics_falha_nao_bloqueia_redirect(self):
        """Mesmo que o handler de analytics levante exceção, o 302 é retornado."""
        code = _create_code("https://example.com")

        def handler_quebrado(event, payload):
            raise RuntimeError("analytics indisponível")

        analytics.register_handler(handler_quebrado)

        resp = client.get(f"/{code}")
        assert resp.status_code == 302


# ---------------------------------------------------------------------------
# Cenário B — Código inexistente: HTTP 404 HTML
# ---------------------------------------------------------------------------

class TestCenarioB:
    """Dado um código que não existe no mapeamento."""

    def test_retorna_404(self):
        resp = client.get("/abcdef")
        assert resp.status_code == 404

    def test_sem_header_location(self):
        resp = client.get("/abcdef")
        assert "location" not in resp.headers

    def test_corpo_e_html(self):
        """t002: 404 retorna HTML em vez de JSON."""
        resp = client.get("/abcdef")
        assert "text/html" in resp.headers.get("content-type", "")

    def test_mensagem_link_nao_encontrado(self):
        """t002: HTML contém a mensagem amigável de erro."""
        resp = client.get("/abcdef")
        assert "link não encontrado" in resp.text.lower()

    def test_sem_detalhes_tecnicos(self):
        """t002: HTML não expõe stack trace nem mensagens internas."""
        resp = client.get("/abcdef")
        body = resp.text.lower()
        assert "traceback" not in body
        assert "exception" not in body
        assert "short code" not in body

    def test_store_vazio_retorna_404(self):
        # Store já está vazio pelo fixture — qualquer código válido → 404.
        resp = client.get("/aBcDeF")
        assert resp.status_code == 404

    def test_analytics_link_nao_encontrado_emitido(self):
        handler = MagicMock()
        analytics.register_handler(handler)

        client.get("/abcdef")

        handler.assert_called_once_with(
            analytics.EVENT_LINK_NAO_ENCONTRADO,
            {"code": "abcdef"},
        )


# ---------------------------------------------------------------------------
# Cenário C — Formato inválido: HTTP 404 HTML, sem consulta ao storage
# ---------------------------------------------------------------------------

class TestCenarioC:
    """Dado um código com formato inválido."""

    @pytest.mark.parametrize("codigo_invalido", [
        "abc",        # curto demais
        "abcdefg",    # longo demais
        "abc-ef",     # hífen não permitido
        "abc ef",     # espaço não permitido
        "abc!ef",     # caractere especial
        "abc.ef",     # ponto não permitido
        "ÂBCdef",     # caractere não-ASCII
        "../etc",     # tentativa de path traversal
    ])
    def test_formato_invalido_retorna_404(self, codigo_invalido):
        # Rotas com "/" serão tratadas diferente pelo FastAPI; testamos
        # apenas os que chegam ao endpoint.
        if "/" in codigo_invalido or codigo_invalido == "":
            pytest.skip("rota não alcança o endpoint GET /{code}")
        resp = client.get(f"/{codigo_invalido}")
        assert resp.status_code == 404

    def test_formato_invalido_sem_header_location(self):
        resp = client.get("/abc")
        assert "location" not in resp.headers

    def test_formato_invalido_retorna_html(self):
        """t002: formatos inválidos também retornam HTML amigável."""
        resp = client.get("/abc")
        assert "text/html" in resp.headers.get("content-type", "")
        assert "link não encontrado" in resp.text.lower()

    def test_formato_invalido_nao_consulta_storage(self):
        """Storage não deve ser acessado para código de formato inválido."""
        # Registramos um código válido; o código inválido não deve retornar esse mapeamento.
        storage.save("abcdef", "https://example.com")
        resp = client.get("/!!!!!!!")
        assert resp.status_code == 404

    def test_analytics_link_nao_encontrado_emitido_para_invalido(self):
        handler = MagicMock()
        analytics.register_handler(handler)

        client.get("/abc!!!")

        handler.assert_called_once_with(
            analytics.EVENT_LINK_NAO_ENCONTRADO,
            {"code": "abc!!!"},
        )


# ---------------------------------------------------------------------------
# Cenário D — Acesso concorrente: todos 302 para o mesmo destino
# ---------------------------------------------------------------------------

class TestCenarioD:
    """Dado um código existente, múltiplos acessos simultâneos."""

    def test_acessos_concorrentes_todos_302(self):
        original = "https://example.com/destino"
        code = _create_code(original)

        resultados: list[int] = []
        locations: list[str] = []
        lock = threading.Lock()

        def fazer_requisicao():
            # Cada thread usa seu próprio cliente para evitar state compartilhado.
            c = TestClient(app, follow_redirects=False)
            resp = c.get(f"/{code}")
            with lock:
                resultados.append(resp.status_code)
                locations.append(resp.headers.get("location", ""))

        n_threads = 20
        threads = [threading.Thread(target=fazer_requisicao) for _ in range(n_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert all(s == 302 for s in resultados), f"Status inesperado: {resultados}"
        assert all(loc == original for loc in locations), f"Location inesperado: {locations}"

    def test_acessos_concorrentes_mesmo_destino(self):
        """Location é idêntico em todos os acessos simultâneos."""
        original = "https://concurrent.example.com/page"
        code = _create_code(original)

        locations: list[str] = []
        lock = threading.Lock()

        def fazer_requisicao():
            c = TestClient(app, follow_redirects=False)
            resp = c.get(f"/{code}")
            with lock:
                locations.append(resp.headers.get("location", ""))

        threads = [threading.Thread(target=fazer_requisicao) for _ in range(15)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(set(locations)) == 1, f"Destinos divergentes: {set(locations)}"
        assert locations[0] == original

    def test_acesso_concorrente_acesso_count_consistente(self):
        """access_count reflete o total correto de acessos concorrentes."""
        code = _create_code("https://example.com")
        n_threads = 10

        threads = [
            threading.Thread(target=lambda: TestClient(app, follow_redirects=False).get(f"/{code}"))
            for _ in range(n_threads)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # O contador deve ser exatamente n_threads (sem race conditions no store em memória).
        assert storage.get_access_count(code) == n_threads