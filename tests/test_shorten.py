"""
Testes BDD para o endpoint POST /shorten.

Cenários cobertos:
  A - URL válida → 201 com codigo_curto e url_curta
  B - URL inválida/ausente → 422 com mensagem clara, sem criar código
  C - Unicidade → dois destinos diferentes geram códigos distintos
  D - Persistência → código criado persiste após recriar sessão/app
  E - Evento → registro url_encurtada com codigo_curto, url_destino e timestamp
"""

from sqlalchemy.orm import sessionmaker

from app.models import Evento, UrlCurta


# ---------------------------------------------------------------------------
# Cenário A: POST com URL válida → 201 com codigo_curto e url_curta
# ---------------------------------------------------------------------------
def test_cenario_a_url_valida_retorna_codigo_e_url_curta(client):
    response = client.post("/shorten", json={"url_destino": "https://exemplo.com/pagina"})

    assert response.status_code == 201, response.text
    data = response.json()
    assert "codigo_curto" in data, "Resposta deve conter 'codigo_curto'"
    assert "url_curta" in data, "Resposta deve conter 'url_curta'"
    assert data["codigo_curto"] != "", "codigo_curto não pode ser vazio"
    assert data["codigo_curto"] in data["url_curta"], (
        "url_curta deve conter o codigo_curto"
    )


# ---------------------------------------------------------------------------
# Cenário B: URL inválida/ausente → 4xx, mensagem clara, nenhum código criado
# ---------------------------------------------------------------------------
def test_cenario_b_url_invalida_retorna_erro(client, db_engine):
    casos_invalidos = [
        {"url_destino": "nao-e-uma-url"},
        {"url_destino": ""},
        {"url_destino": "ftp://sem-http.com"},
        {},  # campo ausente
    ]

    TestingSession = sessionmaker(bind=db_engine)
    session = TestingSession()

    for payload in casos_invalidos:
        response = client.post("/shorten", json=payload)
        assert response.status_code in (400, 422), (
            f"Payload {payload!r} deveria retornar 4xx, obteve {response.status_code}"
        )
        # Nenhum registro deve ter sido criado
        total = session.query(UrlCurta).count()
        assert total == 0, (
            f"Nenhum código deve ser criado para payload inválido {payload!r}"
        )

    session.close()


def test_cenario_b_resposta_contem_mensagem_de_erro(client):
    response = client.post("/shorten", json={"url_destino": "nao-e-url"})
    assert response.status_code == 422
    body = response.json()
    # FastAPI retorna {"detail": [...]} em erros de validação Pydantic
    assert "detail" in body, "Resposta de erro deve conter 'detail'"


# ---------------------------------------------------------------------------
# Cenário C: Unicidade → dois destinos diferentes geram códigos distintos
# ---------------------------------------------------------------------------
def test_cenario_c_destinos_diferentes_geram_codigos_distintos(client):
    r1 = client.post("/shorten", json={"url_destino": "https://site-a.com"})
    r2 = client.post("/shorten", json={"url_destino": "https://site-b.com"})

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["codigo_curto"] != r2.json()["codigo_curto"], (
        "URLs distintas devem receber códigos distintos"
    )


# ---------------------------------------------------------------------------
# Cenário D: Persistência → código ainda existe após nova sessão de DB
# ---------------------------------------------------------------------------
def test_cenario_d_persistencia_apos_nova_sessao(client, db_engine):
    response = client.post("/shorten", json={"url_destino": "https://persistencia.io"})
    assert response.status_code == 201
    codigo = response.json()["codigo_curto"]

    # Abre sessão completamente nova, como se a app tivesse reiniciado
    NovaSession = sessionmaker(bind=db_engine)
    nova_sessao = NovaSession()
    registro = nova_sessao.get(UrlCurta, codigo)
    nova_sessao.close()

    assert registro is not None, (
        f"Código '{codigo}' deve existir no banco após recriar a sessão"
    )
    assert registro.url_destino == "https://persistencia.io/"


# ---------------------------------------------------------------------------
# Cenário E: Evento url_encurtada com codigo_curto, url_destino e timestamp
# ---------------------------------------------------------------------------
def test_cenario_e_evento_url_encurtada_registrado(client, db_engine):
    response = client.post("/shorten", json={"url_destino": "https://eventos.example.com"})
    assert response.status_code == 201
    codigo = response.json()["codigo_curto"]

    TestingSession = sessionmaker(bind=db_engine)
    session = TestingSession()
    evento = (
        session.query(Evento)
        .filter_by(tipo="url_encurtada", codigo_curto=codigo)
        .first()
    )
    session.close()

    assert evento is not None, "Evento 'url_encurtada' deve ser registrado"
    assert evento.codigo_curto == codigo, "Evento deve conter o codigo_curto correto"
    assert "eventos.example.com" in evento.url_destino, (
        "Evento deve conter a url_destino"
    )
    assert evento.timestamp is not None, "Evento deve conter timestamp"