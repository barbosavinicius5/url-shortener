from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_curto = Column(String(6), unique=True, nullable=False, index=True)
    url_original = Column(String, nullable=False)
    total_cliques = Column(Integer, default=0, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)