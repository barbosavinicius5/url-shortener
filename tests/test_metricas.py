"""Testes para GET /metricas/{codigo} (t001-be-consulta-metricas-codigo).

Cobre os cenários BDD definidos na task:
    A — código válido com acessos       → 200 com total_cliques > 0
    B — código válido sem acessos       → 200 com total_cliques == 0
    C — código inexistente              → 404 codigo_nao_encontrado
    D — código malformado/vazio         → 400 codigo_invalido
    E — isolamento entre dois códigos   → contadores independentes
"""

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.app import app

# Cliente sem seguir redirecionamentos (consistente com test_redirect.py)
client = TestClient(app, follow_redirects=False)


@pytest.fixture(autouse=True)
def clear_storage():
    """Limpa o store antes e depois de cada teste."""
    storage.clear()
    yield
    storage.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _shorten(url: str = "https://example.com") -> str:
    """Cria um link curto via POST /shorten e retorna o código gerado."""
    c = TestClient(app)
    response = c.post("/shorten", json={"url": url})
    assert response.status_code == 201
    return response.json()["code"]


def _acessa(code: str, vezes: int = 1) -> None:
    """Simula *vezes* acessos ao código via GET /{code} (incrementa contador e eventos)."""
    for _ in range(vezes):
        client.get(f"/{code}")


# ---------------------------------------------------------------------------
# Cenário A — código válido com acessos → 200
# ---------------------------------------------------------------------------

class TestMetricasComAcessos:
    def test_status_200(self):
        code = _shorten()
        _acessa(code)
        response = client.get(f"/metricas/{code}")
        assert response.status_code == 200

    def test_campo_codigo_presente(self):
        code = _shorten()
        _acessa(code)
        body = client.get(f"/metricas/{code}").json()
        assert body["codigo"] == code

    def test_total_cliques_correto(self):
        code = _shorten()
        _acessa(code, vezes=42)
        body = client.get(f"/metricas/{code}").json()
        assert body["total_cliques"] == 42

    def test_dados_acesso_lista_com_elementos(self):
        code = _shorten()
        _acessa(code, vezes=3)
        body = client.get(f"/metricas/{code}").json()
        assert len(body["dados_acesso"]) == 3

    def test_dados_acesso_tem_campo_acessado_em(self):
        code = _shorten()
        _acessa(code)
        body = client.get(f"/metricas/{code}").json()
        assert "acessado_em" in body["dados_acesso"][0]

    def test_acessado_em_formato_iso8601(self):
        """O campo acessado_em deve seguir o formato ISO-8601 UTC (Z suffix)."""
        code = _shorten()
        _acessa(code)
        body = client.get(f"/metricas/{code}").json()
        acessado_em = body["dados_acesso"][0]["acessado_em"]
        # Formato esperado: "2025-05-28T10:00:00Z"
        assert acessado_em.endswith("Z"), f"Esperado sufixo Z, obtido: {acessado_em}"
        assert "T" in acessado_em

    def test_total_cliques_igual_tamanho_dados_acesso(self):
        code = _shorten()
        _acessa(code, vezes=5)
        body = client.get(f"/metricas/{code}").json()
        assert body["total_cliques"] == len(body["dados_acesso"])


# ---------------------------------------------------------------------------
# Cenário B — código válido sem acessos → 200 com zero
# ---------------------------------------------------------------------------

class TestMetricasSemAcessos:
    def test_status_200(self):
        code = _shorten()
        response = client.get(f"/metricas/{code}")
        assert response.status_code == 200

    def test_total_cliques_zero(self):
        code = _shorten()
        body = client.get(f"/metricas/{code}").json()
        assert body["total_cliques"] == 0

    def test_dados_acesso_lista_vazia(self):
        code = _shorten()
        body = client.get(f"/metricas/{code}").json()
        assert body["dados_acesso"] == []

    def test_campo_codigo_presente(self):
        code = _shorten()
        body = client.get(f"/metricas/{code}").json()
        assert body["codigo"] == code


# ---------------------------------------------------------------------------
# Cenário C — código inexistente → 404
# ---------------------------------------------------------------------------

class TestMetricasCodigoNaoEncontrado:
    def test_status_404(self):
        response = client.get("/metricas/naoexiste")
        assert response.status_code == 404

    def test_campo_erro(self):
        body = client.get("/metricas/naoexiste").json()
        detail = body["detail"]
        assert detail["erro"] == "codigo_nao_encontrado"

    def test_campo_mensagem(self):
        body = client.get("/metricas/naoexiste").json()
        detail = body["detail"]
        assert detail["mensagem"] == "Código não encontrado."

    def test_store_vazio_sempre_404(self):
        # storage limpo pelo fixture — qualquer código inexistente retorna 404
        response = client.get("/metricas/abc123")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Cenário D — código malformado/vazio → 400
# ---------------------------------------------------------------------------

class TestMetricasCodigoInvalido:
    @pytest.mark.parametrize("codigo_invalido", [
        # Nota: string vazia ("") e barra ("abc/def") não chegam ao endpoint via path-param
        # (FastAPI/Starlette trata-os como rotas inválidas antes de chamar o handler).
        # Os casos testáveis via path-param são os abaixo:
        "abc!@#",         # caracteres especiais
        "abc 123",        # espaço (URL-encoded como abc%20123)
        "a" * 33,         # tamanho excessivo (> 32 chars)
        "abc-def",        # hífen não permitido
        "abc.def",        # ponto não permitido
    ])
    def test_codigo_invalido_retorna_400(self, codigo_invalido: str):
        import urllib.parse
        encoded = urllib.parse.quote(codigo_invalido, safe="")
        response = client.get(f"/metricas/{encoded}")
        assert response.status_code == 400, (
            f"Esperado 400 para codigo={codigo_invalido!r}, obtido {response.status_code}"
        )

    def test_campo_erro_codigo_invalido(self):
        body = client.get("/metricas/abc!").json()
        assert body["detail"]["erro"] == "codigo_invalido"

    def test_campo_mensagem_codigo_invalido(self):
        body = client.get("/metricas/abc!").json()
        assert body["detail"]["mensagem"] == "Informe um código válido."

    def test_codigo_apenas_letras_valido(self):
        """Letras puras devem ser aceitas como válidas (não retornar 400)."""
        # O código não existe, então retorna 404 — mas não 400
        response = client.get("/metricas/abcdef")
        assert response.status_code == 404

    def test_codigo_apenas_numeros_valido(self):
        """Dígitos puros devem ser aceitos como válidos (não retornar 400)."""
        response = client.get("/metricas/123456")
        assert response.status_code == 404

    def test_codigo_alfanumerico_valido(self):
        """Alfanumérico misto deve ser aceito (não retornar 400)."""
        response = client.get("/metricas/abc123")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Cenário E — isolamento entre dois códigos distintos
# ---------------------------------------------------------------------------

class TestMetricasIsolamento:
    def test_contadores_independentes(self):
        """Acessos a um código não afetam as métricas do outro."""
        code_a = _shorten("https://a.com")
        code_b = _shorten("https://b.com")

        _acessa(code_a, vezes=10)
        _acessa(code_b, vezes=3)

        body_a = client.get(f"/metricas/{code_a}").json()
        body_b = client.get(f"/metricas/{code_b}").json()

        assert body_a["total_cliques"] == 10
        assert body_b["total_cliques"] == 3

    def test_dados_acesso_isolados(self):
        """dados_acesso retorna exclusivamente os eventos do codigo consultado."""
        code_a = _shorten("https://a.com")
        code_b = _shorten("https://b.com")

        _acessa(code_a, vezes=5)
        _acessa(code_b, vezes=2)

        body_a = client.get(f"/metricas/{code_a}").json()
        body_b = client.get(f"/metricas/{code_b}").json()

        assert len(body_a["dados_acesso"]) == 5
        assert len(body_b["dados_acesso"]) == 2

    def test_codigo_sem_acesso_nao_afetado_por_outro(self):
        """Código sem acessos permanece zerado mesmo que outro tenha muitos acessos."""
        code_a = _shorten("https://a.com")
        code_b = _shorten("https://b.com")

        _acessa(code_a, vezes=100)

        body_b = client.get(f"/metricas/{code_b}").json()
        assert body_b["total_cliques"] == 0
        assert body_b["dados_acesso"] == []

    def test_codigo_correto_no_campo_codigo(self):
        """O campo 'codigo' na resposta reflete exatamente o codigo consultado."""
        code_a = _shorten("https://a.com")
        code_b = _shorten("https://b.com")

        body_a = client.get(f"/metricas/{code_a}").json()
        body_b = client.get(f"/metricas/{code_b}").json()

        assert body_a["codigo"] == code_a
        assert body_b["codigo"] == code_b

    def test_metricas_nao_gera_eventos(self):
        """Consultar métricas é somente-leitura: não incrementa contadores."""
        code = _shorten()
        _acessa(code, vezes=2)

        # Consultas sucessivas de métricas não devem alterar o total_cliques
        client.get(f"/metricas/{code}")
        client.get(f"/metricas/{code}")
        client.get(f"/metricas/{code}")

        body = client.get(f"/metricas/{code}").json()
        assert body["total_cliques"] == 2