from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Link(Base):
    __tablename__ = "links"
    __table_args__ = (
        UniqueConstraint("codigo_curto", name="uq_links_codigo_curto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo_curto: Mapped[str] = mapped_column(String, nullable=False)
    url_original: Mapped[str] = mapped_column(String, nullable=False)
    total_cliques: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
