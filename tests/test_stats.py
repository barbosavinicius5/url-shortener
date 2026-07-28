"""Testes do endpoint GET /{codigo_curto}/stats.

Cobre os cinco cenários obrigatórios da task t001-be-consulta-contagem-cliques:
  A — Código existente → 200 com codigo_curto e cliques
  B — Código inexistente → 404 com mensagem clara
  C — Código inválido (vazio/fora do padrão) → 422 com mensagem descritiva
  D — Consistência: cliques reflete os acessos contabilizados
  E — Analytics: evento stats_consultado emitido a cada consulta
"""

from unittest.mock import call, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import UrlEncurtada
from app.repositorio import RepositorioUrls


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def repo_limpo(monkeypatch: pytest.MonkeyPatch) -> RepositorioUrls:
    """Substitui o repositório global por uma instância isolada por teste."""
    repo = RepositorioUrls()
    import app.repositorio as mod_repo
    import app.routers.urls as mod_urls
    import app.routers.stats as mod_stats

    monkeypatch.setattr(mod_repo, "repositorio", repo)
    monkeypatch.setattr(mod_urls, "repositorio", repo)
    monkeypatch.setattr(mod_stats, "repositorio", repo)
    return repo


@pytest.fixture()
def client(repo_limpo: RepositorioUrls) -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def client_com_url(repo_limpo: RepositorioUrls) -> tuple[TestClient, str]:
    """Retorna cliente + código de uma URL já salva no repositório."""
    codigo = "abc123"
    repo_limpo.salvar(UrlEncurtada(codigo_curto=codigo, url_original="https://exemplo.com"))
    return TestClient(app, raise_server_exceptions=False), codigo


# ---------------------------------------------------------------------------
# Cenário A — Código existente → 200
# ---------------------------------------------------------------------------


class TestCenarioA:
    def test_retorna_200(self, client_com_url: tuple[TestClient, str]) -> None:
        client, codigo = client_com_url
        resp = client.get(f"/{codigo}/stats")
        assert resp.status_code == 200

    def test_corpo_contem_codigo_curto(self, client_com_url: tuple[TestClient, str]) -> None:
        client, codigo = client_com_url
        resp = client.get(f"/{codigo}/stats")
        assert resp.json()["codigo_curto"] == codigo

    def test_corpo_contem_cliques_inteiro_nao_negativo(
        self, client_com_url: tuple[TestClient, str]
    ) -> None:
        client, codigo = client_com_url
        resp = client.get(f"/{codigo}/stats")
        cliques = resp.json()["cliques"]
        assert isinstance(cliques, int)
        assert cliques >= 0

    def test_contrato_completo(self, client_com_url: tuple[TestClient, str]) -> None:
        """Garante exatamente as chaves do contrato: codigo_curto e cliques."""
        client, codigo = client_com_url
        resp = client.get(f"/{codigo}/stats")
        assert set(resp.json().keys()) == {"codigo_curto", "cliques"}


# ---------------------------------------------------------------------------
# Cenário B — Código inexistente → 404
# ---------------------------------------------------------------------------


class TestCenarioB:
    def test_retorna_404(self, client: TestClient) -> None:
        resp = client.get("/nao_existe_xyz/stats")
        assert resp.status_code == 404

    def test_mensagem_clara(self, client: TestClient) -> None:
        resp = client.get("/nao_existe_xyz/stats")
        assert "não encontrado" in resp.json()["detail"].lower()

    def test_contrato_detail(self, client: TestClient) -> None:
        resp = client.get("/nao_existe_xyz/stats")
        assert resp.json()["detail"] == "Código curto não encontrado"


# ---------------------------------------------------------------------------
# Cenário C — Código inválido → 422
# ---------------------------------------------------------------------------


class TestCenarioC:
    @pytest.mark.parametrize(
        "codigo_invalido",
        [
            "codigo com espaco",          # espaço interno
            "código@especial!",           # caracteres especiais
            "a" * 33,                     # excede 32 caracteres
            "   ",                        # apenas espaços (vazio após strip)
        ],
    )
    def test_retorna_422_para_codigo_invalido(
        self, client: TestClient, codigo_invalido: str
    ) -> None:
        resp = client.get(f"/{codigo_invalido}/stats")
        assert resp.status_code == 422

    def test_mensagem_descreve_o_problema(self, client: TestClient) -> None:
        """Mensagem deve descrever o motivo da rejeição, sem expor internals."""
        resp = client.get("/!!!invalido!!!/stats")
        detail = resp.json()["detail"]
        # Deve ser string descritiva, não stack trace
        assert isinstance(detail, str)
        assert len(detail) > 0
        # Não expõe detalhes internos
        assert "traceback" not in detail.lower()
        assert "exception" not in detail.lower()


# ---------------------------------------------------------------------------
# Cenário D — Consistência: cliques reflete acessos reais
# ---------------------------------------------------------------------------


class TestCenarioD:
    def test_cliques_zero_sem_acesso(
        self, repo_limpo: RepositorioUrls
    ) -> None:
        """URL recém-cadastrada deve ter 0 cliques."""
        repo_limpo.salvar(
            UrlEncurtada(codigo_curto="novo", url_original="https://novo.com")
        )
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/novo/stats")
        assert resp.json()["cliques"] == 0

    def test_cliques_reflete_acessos_contabilizados(
        self, repo_limpo: RepositorioUrls
    ) -> None:
        """Após incrementos no repositório, stats deve refletir a contagem."""
        repo_limpo.salvar(
            UrlEncurtada(codigo_curto="multi", url_original="https://multi.com")
        )
        # Simula 3 acessos via repositório
        repo_limpo.incrementar_cliques("multi")
        repo_limpo.incrementar_cliques("multi")
        repo_limpo.incrementar_cliques("multi")

        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/multi/stats")
        assert resp.json()["cliques"] == 3

    def test_cliques_reflete_acessos_via_endpoint_redirecionar(
        self, repo_limpo: RepositorioUrls
    ) -> None:
        """Acessos pelo endpoint de redirecionamento devem incrementar cliques."""
        repo_limpo.salvar(
            UrlEncurtada(codigo_curto="redir", url_original="https://destino.com")
        )
        client = TestClient(app, raise_server_exceptions=False, follow_redirects=False)

        # 2 acessos via redirecionamento
        client.get("/redir")
        client.get("/redir")

        resp = client.get("/redir/stats")
        assert resp.json()["cliques"] == 2


# ---------------------------------------------------------------------------
# Cenário E — Analytics: evento stats_consultado emitido
# ---------------------------------------------------------------------------


class TestCenarioE:
    def test_evento_stats_consultado_emitido(
        self, client_com_url: tuple[TestClient, str]
    ) -> None:
        client, codigo = client_com_url
        with patch("app.routers.stats.emitir_evento") as mock_emitir:
            client.get(f"/{codigo}/stats")
            mock_emitir.assert_called_once()
            nome_evento = mock_emitir.call_args[0][0]
            assert nome_evento == "stats_consultado"

    def test_evento_contem_codigo_curto(
        self, client_com_url: tuple[TestClient, str]
    ) -> None:
        client, codigo = client_com_url
        with patch("app.routers.stats.emitir_evento") as mock_emitir:
            client.get(f"/{codigo}/stats")
            props = mock_emitir.call_args[0][1]
            assert props["codigo_curto"] == codigo

    def test_evento_contem_timestamp(
        self, client_com_url: tuple[TestClient, str]
    ) -> None:
        client, codigo = client_com_url
        with patch("app.routers.stats.emitir_evento") as mock_emitir:
            client.get(f"/{codigo}/stats")
            props = mock_emitir.call_args[0][1]
            assert "timestamp" in props
            assert isinstance(props["timestamp"], str)
            assert len(props["timestamp"]) > 0

    def test_evento_nao_emitido_para_codigo_inexistente(
        self, client: TestClient
    ) -> None:
        """Evento NÃO deve ser emitido quando o código não existe (404)."""
        with patch("app.routers.stats.emitir_evento") as mock_emitir:
            client.get("/inexistente_xyz/stats")
            mock_emitir.assert_not_called()

    def test_evento_nao_emitido_para_codigo_invalido(
        self, client: TestClient
    ) -> None:
        """Evento NÃO deve ser emitido quando a validação rejeita (422)."""
        with patch("app.routers.stats.emitir_evento") as mock_emitir:
            client.get("/!!!invalido!!!/stats")
            mock_emitir.assert_not_called()