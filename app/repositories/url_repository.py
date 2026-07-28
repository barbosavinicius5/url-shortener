import threading

# Armazena o mapeamento codigo -> url_original
_store: dict[str, str] = {}
_lock = threading.Lock()


def save(codigo: str, url_original: str) -> None:
    """Persiste o mapeamento codigo -> url_original."""
    with _lock:
        _store[codigo] = url_original


def exists(codigo: str) -> bool:
    """Verifica se o codigo já existe (para checagem de colisão)."""
    with _lock:
        return codigo in _store


def get(codigo: str) -> str | None:
    """Recupera a url_original associada ao codigo, ou None."""
    with _lock:
        return _store.get(codigo)


def clear() -> None:
    """Limpa o repositório (útil para testes)."""
    with _lock:
        _store.clear()