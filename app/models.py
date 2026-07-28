from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    codigo_curto = Column(String, unique=True, index=True, nullable=False)
    url_original = Column(String, nullable=False)
    total_cliques = Column(Integer, default=0, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)