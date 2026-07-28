from sqlalchemy.orm import Session

from app.models import Link


def get_by_codigo_curto(db: Session, codigo_curto: str) -> Link | None:
    return db.query(Link).filter(Link.codigo_curto == codigo_curto).first()