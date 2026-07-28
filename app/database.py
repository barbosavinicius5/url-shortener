"""Configuração do banco de dados SQLite via SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./url_shortener.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency que fornece sessão do banco e garante fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()