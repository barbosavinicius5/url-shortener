import random
import string
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models import Link

ALPHABET = string.ascii_letters + string.digits  # base62

_SUSPICIOUS = ["<", ">", '"', "'", "javascript:", "data:", "\x00", "\n", "\r"]


def validate_url(url: str) -> tuple[bool, str]:
    """Retorna (is_valid, motivo). motivo vazio se válida."""
    # 1. Tenta fazer parse
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "url_malformada"

    # 2. Verifica se tem scheme e netloc (mínimo para URL bem formada)
    if not parsed.scheme or not parsed.netloc:
        return False, "url_malformada"

    # 3. Verifica esquema
    if parsed.scheme not in ("http", "https"):
        return False, "esquema_invalido"

    # 4. Sanitização básica: rejeita entradas com caracteres suspeitos / injeção
    for s in _SUSPICIOUS:
        if s in url.lower():
            return False, "url_malformada"

    return True, ""


def generate_code(length: int = 6) -> str:
    return "".join(random.choices(ALPHABET, k=length))


def create_short_code(db: Session, max_retries: int = 10) -> str:
    for _ in range(max_retries):
        code = generate_code()
        if not db.query(Link).filter(Link.codigo == code).first():
            return code
    raise RuntimeError("Não foi possível gerar código único após retries")