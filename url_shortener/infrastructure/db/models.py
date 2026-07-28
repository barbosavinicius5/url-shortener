"""SQLAlchemy ORM models."""

from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ShortUrlModel(Base):
    """ORM mapping for the ``short_urls`` table."""

    __tablename__ = "short_urls"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    long_url: Mapped[str] = mapped_column(String, nullable=False)
    short_code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    click_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    project_id: Mapped[str] = mapped_column(String, nullable=False, default="")
