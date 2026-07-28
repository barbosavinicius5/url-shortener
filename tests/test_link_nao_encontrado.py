"""Testes da página "link não encontrado" — t003-fe-pagina-link-nao-encontrado.

Cobre:
  - Código inexistente → 404 + mensagem clara ao visitante
  - Código com formato inválido → 404 + mensagem clara ao visitante
  - Em ambos os casos, ausência do header Location (sem redirecionamento)
"""

import pytest
from fastapi.testclient import TestClient

from shortener import storage
from shortener.app import app

# follow_redirects=False garante que 302 não seja seguido automaticamente
client = TestClient(app, follow_redirects=False)


@pytest.fixture(autouse=True)
def clear_storage():
    """Limpa o armazenamento antes e depois de cada teste."""
    storage.clear()
    yield
    storage.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _body_text(response) -> str:
    """Retorna o corpo da resposta como texto, seja HTML ou JSON."""
    content_type = response.headers.get("content-type", "")
    if "html" in content_type:
        return response.text
    # JSON — converte para string para facilitar busca textual
    return str(response.json())


# ---------------------------------------------------------------------------
# Código inexistente
# ---------------------------------------------------------------------------


class TestCodigoInexistente:
    """O armazenamento está vazio; qualquer código deve resultar em 404."""

    def test_retorna_status_404(self):
        """Código inexistente → HTTP 404."""
        response = client.get("/codigoquenaoexiste")
        assert response.status_code == 404

    def test_corpo_contem_mensagem_de_nao_encontrado(self):
        """O corpo da resposta deve comunicar claramente que o link não foi encontrado."""
        response = client.get("/linkausente")
        texto = _body_text(response).lower()
        # Aceita variações: "não encontrado", "nao encontrado", "not found", "link not found"
        assert any(
            termo in texto
            for termo in ("não encontrado", "nao encontrado", "not found", "link not found")
        ), f"Mensagem de 'não encontrado' ausente no corpo: {texto[:200]}"

    def test_sem_header_location(self):
        """404 não deve conter o header Location (nenhum redirecionamento)."""
        response = client.get("/semredirecionamento")
        assert response.status_code == 404
        assert "location" not in response.headers, (
            "Header 'Location' presente em resposta 404 — não deve haver redirecionamento."
        )

    def test_multiplos_codigos_inexistentes_retornam_404(self):
        """Vários códigos inexistentes diferentes → todos retornam 404."""
        for codigo in ("abc123", "XYZ999", "aaaaaa", "zzzzzz"):
            response = client.get(f"/{codigo}")
            assert response.status_code == 404, f"Esperado 404 para /{codigo}"


# ---------------------------------------------------------------------------
# Código com formato inválido
# ---------------------------------------------------------------------------


class TestCodigoFormatoInvalido:
    """Códigos fora do padrão alfanumérico devem retornar 404 sem redirecionar."""

    def test_codigo_com_caractere_especial_retorna_404(self):
        """Código com '@' (inválido) → 404."""
        response = client.get("/cod!go-inv@lido")
        assert response.status_code == 404

    def test_codigo_com_espaco_retorna_404(self):
        """Código com espaço codificado → 404."""
        # %20 é a codificação URL de espaço; FastAPI recebe " "
        response = client.get("/codigo%20invalido")
        assert response.status_code == 404

    def test_codigo_com_ponto_retorna_404(self):
        """Código contendo '.' → 404."""
        response = client.get("/codigo.invalido")
        assert response.status_code == 404

    def test_codigo_com_hifen_retorna_404(self):
        """Código contendo '-' → 404."""
        response = client.get("/codigo-invalido")
        assert response.status_code == 404

    def test_codigo_invalido_sem_header_location(self):
        """Código inválido → 404 sem header Location (nenhum redirecionamento)."""
        response = client.get("/inv@lido!")
        assert response.status_code == 404
        assert "location" not in response.headers, (
            "Header 'Location' presente em resposta 404 para código inválido."
        )

    def test_codigo_invalido_contem_mensagem_clara(self):
        """Código inválido → corpo com mensagem compreensível ao visitante leigo."""
        response = client.get("/inv@lido!")
        texto = _body_text(response).lower()
        assert any(
            termo in texto
            for termo in ("não encontrado", "nao encontrado", "not found", "link not found")
        ), f"Mensagem de 'não encontrado' ausente no corpo: {texto[:200]}"


# ---------------------------------------------------------------------------
# Garantia de que link válido ainda redireciona (sem regressão)
# ---------------------------------------------------------------------------


class TestSemRegressao:
    """Garante que a página 404 não interfere no fluxo de redirecionamento 302."""

    def _shorten(self, url: str) -> str:
        c = TestClient(app)
        response = c.post("/shorten", json={"url": url})
        assert response.status_code == 201
        return response.json()["code"]

    def test_link_valido_ainda_redireciona_302(self):
        """Link existente ainda retorna 302, não 404."""
        code = self._shorten("https://example.com/pagina")
        response = client.get(f"/{code}")
        assert response.status_code == 302

    def test_link_valido_tem_header_location(self):
        """Link existente ainda possui header Location correto."""
        original = "https://example.com/destino"
        code = self._shorten(original)
        response = client.get(f"/{code}")
        assert response.headers["location"] == original