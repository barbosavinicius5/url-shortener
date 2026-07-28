from app.models import Link


def test_cenario_a_codigo_existente(client):
    """Cenário A: GET /{codigo} com código existente retorna 302 e header location."""
    db = client._SessionLocal()
    try:
        link = Link(codigo="abc123", url_original="https://example.com/pagina-longa")
        db.add(link)
        db.commit()
    finally:
        db.close()

    response = client.get("/abc123", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "https://example.com/pagina-longa"


def test_cenario_b_codigo_inexistente(client):
    """Cenário B: GET /{codigo} com código inexistente retorna 404 sem header location."""
    response = client.get("/codigo-que-nao-existe", follow_redirects=False)

    assert response.status_code == 404
    assert "location" not in response.headers


def test_cenario_c_acesso_publico(client):
    """Cenário C: GET /{codigo} sem autenticação retorna 302 (não 401 nem 403)."""
    db = client._SessionLocal()
    try:
        link = Link(codigo="publico", url_original="https://example.com")
        db.add(link)
        db.commit()
    finally:
        db.close()

    response = client.get("/publico", follow_redirects=False)

    assert response.status_code not in (401, 403)
    assert response.status_code == 302