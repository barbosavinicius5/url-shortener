from sqlalchemy.orm import Session

from app.models import Link


class LinkRepository:
    """Interface de persistência para a entidade Link."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_codigo_curto(self, codigo_curto: str) -> Link | None:
        """Consulta um Link pelo codigo_curto. Retorna None se não encontrado."""
        return (
            self.db.query(Link)
            .filter(Link.codigo_curto == codigo_curto)
            .first()
        )

    def save(self, link: Link) -> Link:
        """Persiste o Link no banco e retorna o objeto atualizado."""
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link