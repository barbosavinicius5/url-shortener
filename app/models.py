"""Modelos ORM: tabelas de URLs encurtadas e eventos."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UrlCurta(Base):
    """Mapeia codigo_curto → url_destino de forma durável."""

    __tablename__ = "urls_curtas"

    codigo_curto: Mapped[str] = mapped_column(String(16), primary_key=True)
    url_destino: Mapped[str] = mapped_column(String(2048), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Evento(Base):
    """Registra eventos de domínio (ex.: url_encurtada)."""

    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(String(64), nullable=False)
    codigo_curto: Mapped[str] = mapped_column(String(16), nullable=False)
    url_destino: Mapped[str] = mapped_column(String(2048), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )