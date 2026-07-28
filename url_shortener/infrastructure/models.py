from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class LinkModel(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    short_code = Column(String(20), nullable=False, unique=True, index=True)
    original_url = Column(String(2048), nullable=False)
    is_permanent = Column(Boolean, nullable=False, default=False)
    click_count = Column(Integer, nullable=False, default=0)
