from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.database import Base


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True)
    codigo = Column(String(10), unique=True, nullable=False, index=True)
    url_original = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)