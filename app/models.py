from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=False)
    url_original = Column(String, nullable=False)
    total_cliques = Column(Integer, default=0, nullable=False)
    criado_em = Column(DateTime(timezone=True), default=_utcnow, nullable=False)