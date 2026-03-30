"""
Database connection — supports SQLite (local dev) and PostgreSQL (production).
Set DATABASE_URL env var to a postgres:// URI to use PostgreSQL.
"""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

DATABASE_URL = os.environ.get("DATABASE_URL", "")
USE_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))

DB_PATH = Path(__file__).parent / "hvac.db"

DDL = """
CREATE TABLE IF NOT EXISTS proposals (
    id                    TEXT PRIMARY KEY,
    customer_name         TEXT NOT NULL,
    customer_address      TEXT NOT NULL,
    technician_name       TEXT NOT NULL,
    visit_date            TEXT NOT NULL,
    system_type           TEXT NOT NULL,
    service_type          TEXT NOT NULL,
    system_size_tons      REAL NOT NULL,
    stage                 TEXT NOT NULL DEFAULT 'estimate_ready',
    urgency               TEXT NOT NULL DEFAULT 'routine',
    r22_flag              INTEGER NOT NULL DEFAULT 0,
    permit_required       INTEGER NOT NULL DEFAULT 0,
    seer2_compliance_note INTEGER NOT NULL DEFAULT 1,
    good_tier             TEXT NOT NULL,
    better_tier           TEXT NOT NULL,
    best_tier             TEXT NOT NULL,
    good_price            TEXT NOT NULL DEFAULT '[PRICE TBD]',
    better_price          TEXT NOT NULL DEFAULT '[PRICE TBD]',
    best_price            TEXT NOT NULL DEFAULT '[PRICE TBD]',
    pipeline_value        REAL NOT NULL DEFAULT 0,
    notes                 TEXT,
    owner_notes           TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
);
"""


class _Conn:
    """Thin wrapper that normalises sqlite3 and psycopg2 to a common interface."""

    def __init__(self, raw: Any, is_postgres: bool):
        self._raw = raw
        self._pg = is_postgres

    def execute(self, sql: str, params: Any = ()):
        if self._pg:
            sql = sql.replace("?", "%s")
            cur = self._raw.cursor()
            cur.execute(sql, params)
            return cur
        return self._raw.execute(sql, params)

    def commit(self):
        self._raw.commit()

    def close(self):
        self._raw.close()


@contextmanager
def get_db():
    if USE_POSTGRES:
        import psycopg2
        import psycopg2.extras
        raw = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        raw = sqlite3.connect(DB_PATH)
        raw.row_factory = sqlite3.Row
        raw.execute("PRAGMA journal_mode=WAL")

    conn = _Conn(raw, is_postgres=USE_POSTGRES)
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.execute(DDL.strip().rstrip(";"))
        conn.commit()
