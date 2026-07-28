"""Configuracao compartilhada entre suites de teste.

Um unico banco SQLite em memoria com StaticPool e usado por testes sequenciais.
O override de get_db eh registrado aqui para garantir consistencia.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# Banco SQLite em memoria compartilhado entre TODOS os testes deste processo.
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)

# Cria o schema com o modelo atualizado (incluindo cliques).
Base.metadata.drop_all(bind=TEST_ENGINE)
Base.metadata.create_all(bind=TEST_ENGINE)


def _get_test_db():
    db = TestSessionFactory()
    try:
        yield db
    finally:
        db.close()


# Registra o override globalmente para toda a aplicacao.
app.dependency_overrides[get_db] = _get_test_db
