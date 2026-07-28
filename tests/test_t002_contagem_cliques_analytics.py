"""Testes BDD — t002: contagem de cliques e analytics de redirecionamento.

Cenário A — Incremento em sucesso:
    Dado total_cliques = X, após 1 acesso bem-sucedido, total_cliques = X + 1.

Cenário B — Concorrência (incremento atômico):
    N acessos concorrentes ao mesmo código; contador final == N.

Cenário C — Evento url_redirecionada:
    Com Referer no header → evento emitido com codigo, timestamp e referrer.
    Sem Referer → evento emitido com codigo e timestamp (referrer None/omitido).

Cenário D — Evento redirecionamento_nao_encontrado:
    Código inexistente → evento emitido com codigo e timestamp.
    total_cliques de outros códigos não é alterado.

Cenário E — Nomenclatura:
    Campo do contador se chama total_cliques.
    Eventos se chamam url_redirecionada e redirecionamento_nao_encontrado.
"""

import threading
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.analytics as analytics_module
from app.database import Base, get_db
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
    """Limpa tabela de links e eventos antes e após cada teste."""
    db = TestSessionFactory()
    db.query(Link).delete()
    db.commit()
    db.close()
    analytics_module.limpar_eventos()
    yield
    db = TestSessionFactory()
    db.query(Link).delete()
    db.commit()
    db.close()
    analytics_module.limpar_eventos()


def _criar_link(url: str = "https://exemplo.com") -> str:
    """Cria um link via POST /shorten e retorna o codigo curto."""
    resp = TestClient(app).post("/shorten", json={"url": url})
    assert resp.status_code == 201, resp.json()
    return resp.json()["codigo"]


def _get_total_cliques(codigo: str) -> int:
    """Consulta o campo total_cliques diretamente no banco de testes."""
    db = TestSessionFactory()
    link = db.query(Link).filter(Link.codigo == codigo).first()
    db.close()
    return link.total_cliques if link else 0


def _get_cliques(codigo: str) -> int:
    """Consulta o campo cliques (t001) diretamente no banco de testes."""
    db = TestSessionFactory()
    link = db.query(Link).filter(Link.codigo == codigo).first()
    db.close()
    return link.cliques if link else 0


# ---------------------------------------------------------------------------
# Cenário A — Incremento em sucesso
# ---------------------------------------------------------------------------

class TestCenarioA:
    def test_a1_total_cliques_comeca_em_zero(self):
        """Novo link deve ter total_cliques == 0."""
        codigo = _criar_link()
        assert _get_total_cliques(codigo) == 0

    def test_a2_total_cliques_incrementado_em_um_apos_um_acesso(self):
        """Dado total_cliques = 0, após 1 acesso, total_cliques = 1."""
        codigo = _criar_link()
        assert _get_total_cliques(codigo) == 0
        client.get(f"/{codigo}")
        assert _get_total_cliques(codigo) == 1

    def test_a3_total_cliques_acumula_em_multiplos_acessos(self):
        """Cada acesso incrementa total_cliques em exatamente +1."""
        codigo = _criar_link()
        for esperado in range(1, 6):
            client.get(f"/{codigo}")
            assert _get_total_cliques(codigo) == esperado

    def test_a4_total_cliques_e_cliques_incrementados_juntos(self):
        """total_cliques e cliques (t001) devem ser incrementados no mesmo acesso."""
        codigo = _criar_link()
        client.get(f"/{codigo}")
        assert _get_total_cliques(codigo) == 1
        assert _get_cliques(codigo) == 1

    def test_a5_404_nao_incrementa_total_cliques(self):
        """Acesso a código inexistente não deve alterar total_cliques de nenhum link."""
        codigo = _criar_link()
        client.get("/codigoinexistente")
        assert _get_total_cliques(codigo) == 0


# ---------------------------------------------------------------------------
# Cenário B — Concorrência (incremento atômico)
# ---------------------------------------------------------------------------

_CONCURRENT_DB_URL = "sqlite:///./test_t002_concurrent.db"


@pytest.fixture()
def concurrent_engine_and_session():
    """Engine SQLite em arquivo com WAL para testes de concorrência."""
    import sqlalchemy

    eng = create_engine(
        _CONCURRENT_DB_URL,
        connect_args={"check_same_thread": False},
    )
    with eng.connect() as conn:
        conn.execute(sqlalchemy.text("PRAGMA journal_mode=WAL"))
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
    # Restaura o override padrão de testes.
    from tests.conftest import _get_test_db
    app.dependency_overrides[get_db] = _get_test_db
    Base.metadata.drop_all(bind=eng)
    eng.dispose()


class TestCenarioB:
    def test_b1_n_acessos_simultaneos_sem_perda(self, concurrent_engine_and_session):
        """N acessos concorrentes → total_cliques == N (sem race condition)."""
        N = 10
        eng, SessionLocal = concurrent_engine_and_session

        db = SessionLocal()
        link = Link(codigo="tst002b", url_original="https://concorrencia.com")
        db.add(link)
        db.commit()
        db.close()

        erros = []

        def acessar():
            try:
                c = TestClient(app, follow_redirects=False)
                c.get("/tst002b")
            except Exception as e:
                erros.append(e)

        threads = [threading.Thread(target=acessar) for _ in range(N)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert erros == [], f"Threads produziram erros: {erros}"

        db = SessionLocal()
        link_final = db.query(Link).filter(Link.codigo == "tst002b").first()
        db.close()

        assert link_final.total_cliques == N, (
            f"Esperado total_cliques={N}, obtido={link_final.total_cliques} "
            "(possível race condition ou perda de atualização)"
        )

    def test_b2_cliques_atomicos_codigos_independentes(self, concurrent_engine_and_session):
        """Acessos concorrentes a códigos distintos não interferem nas contagens."""
        N = 5
        eng, SessionLocal = concurrent_engine_and_session

        db = SessionLocal()
        db.add(Link(codigo="codigo_a", url_original="https://a.com"))
        db.add(Link(codigo="codigo_b", url_original="https://b.com"))
        db.commit()
        db.close()

        erros = []

        def acessar(cod):
            try:
                c = TestClient(app, follow_redirects=False)
                c.get(f"/{cod}")
            except Exception as e:
                erros.append(e)

        threads = (
            [threading.Thread(target=acessar, args=("codigo_a",)) for _ in range(N)]
            + [threading.Thread(target=acessar, args=("codigo_b",)) for _ in range(N)]
        )
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert erros == []

        db = SessionLocal()
        a = db.query(Link).filter(Link.codigo == "codigo_a").first()
        b = db.query(Link).filter(Link.codigo == "codigo_b").first()
        db.close()

        assert a.total_cliques == N
        assert b.total_cliques == N


# ---------------------------------------------------------------------------
# Cenário C — Evento url_redirecionada
# ---------------------------------------------------------------------------

class TestCenarioC:
    def test_c1_evento_url_redirecionada_emitido_com_sucesso(self):
        """Evento url_redirecionada deve ser registrado após redirect bem-sucedido."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        eventos = [
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        ]
        assert len(eventos) == 1

    def test_c2_evento_url_redirecionada_contem_codigo(self):
        """Evento url_redirecionada deve ter campo codigo com o código acessado."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        )
        assert evento["codigo"] == codigo

    def test_c3_evento_url_redirecionada_contem_timestamp_iso8601(self):
        """Evento url_redirecionada deve ter campo timestamp em formato ISO 8601."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        )
        assert "timestamp" in evento
        datetime.fromisoformat(evento["timestamp"])  # lança ValueError se inválido

    def test_c4_evento_url_redirecionada_com_referer_no_header(self):
        """Com header Referer, evento url_redirecionada deve ter referrer preenchido."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        referrer_enviado = "https://origem.com/pagina"
        client.get(f"/{codigo}", headers={"Referer": referrer_enviado})
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        )
        assert evento.get("referrer") == referrer_enviado

    def test_c5_evento_url_redirecionada_sem_referer_referrer_none(self):
        """Sem header Referer, evento url_redirecionada deve ter referrer None ou omitido."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        )
        # Aceita tanto ausência da chave quanto valor None.
        referrer = evento.get("referrer")
        assert referrer is None, f"Esperado referrer None, obtido: {referrer!r}"

    def test_c6_um_evento_por_acesso(self):
        """Cada acesso bem-sucedido emite exatamente 1 evento url_redirecionada."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        N = 3
        for _ in range(N):
            client.get(f"/{codigo}")
        eventos = [
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        ]
        assert len(eventos) == N

    def test_c7_evento_registrado_via_patch_spy(self):
        """registrar_evento pode ser espionado via unittest.mock.patch."""
        codigo = _criar_link()
        with patch("app.router.registrar_evento") as spy:
            client.get(f"/{codigo}")
        chamadas = [
            call.args[0]
            for call in spy.call_args_list
            if call.args and call.args[0].get("evento") == "url_redirecionada"
        ]
        assert len(chamadas) == 1
        assert chamadas[0]["codigo"] == codigo


# ---------------------------------------------------------------------------
# Cenário D — Evento redirecionamento_nao_encontrado
# ---------------------------------------------------------------------------

class TestCenarioD:
    def test_d1_evento_redirecionamento_nao_encontrado_emitido(self):
        """Acesso a código inexistente → evento redirecionamento_nao_encontrado emitido."""
        analytics_module.limpar_eventos()
        client.get("/codigofantasma")
        eventos = [
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "redirecionamento_nao_encontrado"
        ]
        assert len(eventos) == 1

    def test_d2_evento_redirecionamento_nao_encontrado_contem_codigo(self):
        """Evento redirecionamento_nao_encontrado deve ter campo codigo correto."""
        analytics_module.limpar_eventos()
        client.get("/fantasma99")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "redirecionamento_nao_encontrado"
        )
        assert evento["codigo"] == "fantasma99"

    def test_d3_evento_redirecionamento_nao_encontrado_contem_timestamp(self):
        """Evento redirecionamento_nao_encontrado deve ter timestamp ISO 8601."""
        analytics_module.limpar_eventos()
        client.get("/fantasma")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "redirecionamento_nao_encontrado"
        )
        assert "timestamp" in evento
        datetime.fromisoformat(evento["timestamp"])

    def test_d4_total_cliques_outros_codigos_nao_alterado(self):
        """Acesso a código inexistente não altera total_cliques de outros links."""
        codigo = _criar_link()
        client.get(f"/{codigo}")
        cliques_antes = _get_total_cliques(codigo)

        client.get("/codigofantasma")

        assert _get_total_cliques(codigo) == cliques_antes

    def test_d5_total_cliques_permanece_zero_para_inexistente(self):
        """Link nunca acessado tem total_cliques = 0 mesmo após 404 de outros."""
        codigo = _criar_link()
        client.get("/naoexiste1")
        client.get("/naoexiste2")
        assert _get_total_cliques(codigo) == 0

    def test_d6_404_nao_emite_url_redirecionada(self):
        """Acesso a código inexistente NÃO deve emitir url_redirecionada."""
        analytics_module.limpar_eventos()
        client.get("/codigofantasma")
        eventos_sucesso = [
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        ]
        assert len(eventos_sucesso) == 0


# ---------------------------------------------------------------------------
# Cenário E — Nomenclatura
# ---------------------------------------------------------------------------

class TestCenarioE:
    def test_e1_campo_contador_se_chama_total_cliques(self):
        """O modelo Link deve ter atributo total_cliques."""
        assert hasattr(Link, "total_cliques"), (
            "Modelo Link não possui campo total_cliques"
        )

    def test_e2_total_cliques_e_inteiro_com_default_zero(self):
        """total_cliques deve ser inteiro com valor padrão 0 em novo link."""
        codigo = _criar_link()
        db = TestSessionFactory()
        link = db.query(Link).filter(Link.codigo == codigo).first()
        db.close()
        assert isinstance(link.total_cliques, int)
        assert link.total_cliques == 0

    def test_e3_evento_sucesso_se_chama_url_redirecionada(self):
        """O evento de sucesso deve ter campo 'evento' == 'url_redirecionada'."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        nomes = [e.get("evento") for e in analytics_module.get_eventos()]
        assert "url_redirecionada" in nomes, (
            f"Evento 'url_redirecionada' não encontrado. Eventos emitidos: {nomes}"
        )

    def test_e4_evento_nao_encontrado_se_chama_redirecionamento_nao_encontrado(self):
        """O evento de não encontrado deve ter campo 'evento' == 'redirecionamento_nao_encontrado'."""
        analytics_module.limpar_eventos()
        client.get("/naoexiste")
        nomes = [e.get("evento") for e in analytics_module.get_eventos()]
        assert "redirecionamento_nao_encontrado" in nomes, (
            f"Evento 'redirecionamento_nao_encontrado' não encontrado. Eventos: {nomes}"
        )

    def test_e5_campo_codigo_consistente_no_evento_sucesso(self):
        """Evento url_redirecionada usa campo 'codigo' (não 'codigo_curto')."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "url_redirecionada"
        )
        assert "codigo" in evento, "Evento url_redirecionada deve ter campo 'codigo'"
        assert evento["codigo"] == codigo

    def test_e6_campo_codigo_consistente_no_evento_nao_encontrado(self):
        """Evento redirecionamento_nao_encontrado usa campo 'codigo' (não 'codigo_curto')."""
        analytics_module.limpar_eventos()
        client.get("/testenome")
        evento = next(
            e for e in analytics_module.get_eventos()
            if e.get("evento") == "redirecionamento_nao_encontrado"
        )
        assert "codigo" in evento, (
            "Evento redirecionamento_nao_encontrado deve ter campo 'codigo'"
        )
        assert evento["codigo"] == "testenome"

    def test_e7_nomenclatura_snake_case_portugues(self):
        """Nomes dos eventos e campos seguem snake_case em português."""
        analytics_module.limpar_eventos()
        codigo = _criar_link()
        client.get(f"/{codigo}")
        client.get("/inexistente")

        for evento in analytics_module.get_eventos():
            nome = evento.get("evento", "")
            # Deve estar em snake_case (sem camelCase ou hífens).
            assert nome == nome.lower(), f"Evento '{nome}' não está em minúsculas"
            assert "-" not in nome, f"Evento '{nome}' contém hífen"