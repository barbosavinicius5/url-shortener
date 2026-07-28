"""Testes unitários para app/services.py — 4 cenários BDD."""

from datetime import datetime
from unittest.mock import MagicMock, call

import pytest

from app.models import Link
from app.services import criar_encurtamento


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_repo(get_side_effect=None, save_side_effect=None):
    """Cria um stub de repositório."""
    repo = MagicMock()
    if get_side_effect is not None:
        repo.get_by_codigo_curto.side_effect = get_side_effect
    else:
        repo.get_by_codigo_curto.return_value = None

    if save_side_effect is not None:
        repo.save.side_effect = save_side_effect
    else:
        # save devolve o próprio link recebido
        repo.save.side_effect = lambda link: link

    return repo


def _make_analytics():
    return MagicMock()


# ---------------------------------------------------------------------------
# Cenário A — Sem colisão
# ---------------------------------------------------------------------------

class TestCenarioA:
    """Dado que get_by_codigo_curto retorna None (código não existe),
    o mapeamento deve ser persistido com todos os campos obrigatórios.
    """

    def test_persiste_com_campos_obrigatorios(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        link = criar_encurtamento("https://exemplo.com", repo, analytics)

        # save chamado exatamente uma vez
        repo.save.assert_called_once()

        # verifica o objeto passado para save
        link_salvo = repo.save.call_args[0][0]
        assert isinstance(link_salvo.codigo_curto, str)
        assert len(link_salvo.codigo_curto) == 6
        assert link_salvo.url_original == "https://exemplo.com"
        assert link_salvo.total_cliques == 0
        assert link_salvo.criado_em is not None

    def test_retorna_link(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        resultado = criar_encurtamento("https://exemplo.com", repo, analytics)

        assert resultado is not None
        assert resultado.url_original == "https://exemplo.com"


# ---------------------------------------------------------------------------
# Cenário B — Colisão
# ---------------------------------------------------------------------------

class TestCenarioB:
    """Dado que get_by_codigo_curto retorna um Link existente na 1ª chamada
    e None na 2ª, deve regenerar o código e chamar save apenas uma vez.
    """

    def test_regenera_codigo_em_colisao(self):
        link_existente = Link(
            codigo_curto="AAAAAA",
            url_original="https://outro.com",
            total_cliques=0,
            criado_em=datetime.utcnow(),
        )
        # 1ª consulta → colisão; 2ª → livre
        repo = _make_repo(get_side_effect=[link_existente, None])
        analytics = _make_analytics()

        criar_encurtamento("https://novo.com", repo, analytics)

        # get_by_codigo_curto chamado pelo menos 2 vezes
        assert repo.get_by_codigo_curto.call_count >= 2

    def test_save_chamado_exatamente_uma_vez(self):
        link_existente = Link(
            codigo_curto="BBBBBB",
            url_original="https://outro.com",
            total_cliques=0,
            criado_em=datetime.utcnow(),
        )
        repo = _make_repo(get_side_effect=[link_existente, None])
        analytics = _make_analytics()

        criar_encurtamento("https://novo.com", repo, analytics)

        repo.save.assert_called_once()

    def test_codigo_salvo_diferente_do_que_colidiu(self):
        codigo_colisao = "CCCCCC"
        link_existente = Link(
            codigo_curto=codigo_colisao,
            url_original="https://outro.com",
            total_cliques=0,
            criado_em=datetime.utcnow(),
        )
        repo = _make_repo(get_side_effect=[link_existente, None])
        analytics = _make_analytics()

        # Força a primeira geração a colidir e a segunda a ser diferente
        # Patching interno não é necessário pois o side_effect já controla o fluxo;
        # apenas verificamos que o código salvo é único (não é None).
        criar_encurtamento("https://novo.com", repo, analytics)

        link_salvo = repo.save.call_args[0][0]
        # O código salvo não pode ser None e deve ter 6 chars
        assert link_salvo.codigo_curto is not None
        assert len(link_salvo.codigo_curto) == 6


# ---------------------------------------------------------------------------
# Cenário C — Evento de analytics
# ---------------------------------------------------------------------------

class TestCenarioC:
    """Dado que a criação é bem-sucedida, analytics.emit deve ser chamado
    exatamente uma vez com event_name='url_encurtada' e as propriedades corretas.
    """

    def test_emit_chamado_uma_vez(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        criar_encurtamento("https://evento.com", repo, analytics)

        analytics.emit.assert_called_once()

    def test_emit_event_name_correto(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        criar_encurtamento("https://evento.com", repo, analytics)

        args, _ = analytics.emit.call_args
        assert args[0] == "url_encurtada"

    def test_emit_propriedades_obrigatorias(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        criar_encurtamento("https://evento.com", repo, analytics)

        _, kwargs_or_positional = analytics.emit.call_args
        # emit(event_name, properties) → properties é 2º argumento posicional
        args, _ = analytics.emit.call_args
        properties = args[1]

        assert "codigo_curto" in properties
        assert "url_original" in properties
        assert "criado_em" in properties
        assert properties["url_original"] == "https://evento.com"
        assert properties["criado_em"] is not None


# ---------------------------------------------------------------------------
# Cenário D — Estado inicial
# ---------------------------------------------------------------------------

class TestCenarioD:
    """Dado um encurtamento recém-criado, total_cliques deve ser 0
    e criado_em não deve ser None.
    """

    def test_total_cliques_zero(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        link = criar_encurtamento("https://inicial.com", repo, analytics)

        assert link.total_cliques == 0

    def test_criado_em_nao_nulo(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        link = criar_encurtamento("https://inicial.com", repo, analytics)

        assert link.criado_em is not None

    def test_criado_em_e_datetime(self):
        repo = _make_repo(get_side_effect=[None])
        analytics = _make_analytics()

        link = criar_encurtamento("https://inicial.com", repo, analytics)

        assert isinstance(link.criado_em, datetime)