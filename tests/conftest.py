"""Fixtures compartilhadas: banco in-memory isolado por fixture de teste."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base

# SQLite in-memory com StaticPool: todas as conexões usam a mesma conexão
# física, garantindo que CREATE TABLE e os INSERTs vivam no mesmo banco.
_MEMORY_URL = "sqlite://"


@pytest.fixture()
def db_engine():
    """Engine in-memory com schema criado antes de cada teste."""
    engine = create_engine(
        _MEMORY_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture()
def client(db_engine):
    """TestClient com dependency override apontando para o banco in-memory."""
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()
