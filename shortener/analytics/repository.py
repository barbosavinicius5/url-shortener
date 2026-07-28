"""Repositorio de analytics com persistencia em SQLite (in-memory compartilhado)."""

import sqlite3
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

# Uma unica conexao persistente compartilhada em todo o processo.
# O banco in-memory e valido enquanto esta conexao estiver aberta.
_DB_NAME = "file:analytics?mode=memory&cache=shared&uri=true"
_conn: Optional[sqlite3.Connection] = None
_lock = Lock()


def _get_conn() -> sqlite3.Connection:
    """Retorna (ou cria) a conexao singleton para o banco in-memory."""
    global _conn
    if _conn is None:
        with _lock:
            if _conn is None:
                _conn = sqlite3.connect(_DB_NAME, uri=True, check_same_thread=False)
                _conn.execute("PRAGMA journal_mode=WAL")
                _criar_tabela(_conn)
    return _conn


def _criar_tabela(conn: sqlite3.Connection) -> None:
    """Cria a tabela eventos_analytics se ainda nao existir."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS eventos_analytics (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_evento TEXT    NOT NULL,
            codigo      TEXT    NOT NULL,
            timestamp   TEXT    NOT NULL,
            referrer    TEXT,
            user_agent  TEXT
        )
        """
    )
    conn.commit()


# Inicializa ao importar o modulo.
_get_conn()


class AnalyticsRepository:
    """Camada de acesso ao banco de eventos de analytics."""

    def registrar_link_acessado(
        self,
        codigo: str,
        referrer: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Grava um evento link_acessado no banco."""
        ts = datetime.now(timezone.utc).isoformat()
        conn = _get_conn()
        with _lock:
            conn.execute(
                """
                INSERT INTO eventos_analytics
                    (tipo_evento, codigo, timestamp, referrer, user_agent)
                VALUES (?, ?, ?, ?, ?)
                """,
                ("link_acessado", codigo, ts, referrer, user_agent),
            )
            conn.commit()

    def registrar_link_nao_encontrado(self, codigo: str) -> None:
        """Grava um evento link_nao_encontrado no banco."""
        ts = datetime.now(timezone.utc).isoformat()
        conn = _get_conn()
        with _lock:
            conn.execute(
                """
                INSERT INTO eventos_analytics
                    (tipo_evento, codigo, timestamp, referrer, user_agent)
                VALUES (?, ?, ?, NULL, NULL)
                """,
                ("link_nao_encontrado", codigo, ts),
            )
            conn.commit()

    def contar_cliques(self, codigo: str) -> int:
        """Retorna o COUNT de eventos link_acessado para codigo.

        A contagem e sempre derivada dos eventos persistidos -- nao ha
        contador separado que possa divergir.
        """
        conn = _get_conn()
        with _lock:
            cur = conn.execute(
                """
                SELECT COUNT(*)
                FROM   eventos_analytics
                WHERE  tipo_evento = 'link_acessado'
                AND    codigo      = ?
                """,
                (codigo,),
            )
            row = cur.fetchone()
            return row[0] if row else 0

    def limpar(self) -> None:
        """Remove todos os eventos (usar apenas em testes)."""
        conn = _get_conn()
        with _lock:
            conn.execute("DELETE FROM eventos_analytics")
            conn.commit()
