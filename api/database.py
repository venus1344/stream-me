import os
from contextlib import contextmanager
import psycopg2

DATABASE_URL = os.environ["DATABASE_URL"]


@contextmanager
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            # Drop in reverse FK order
            cur.execute("DROP TABLE IF EXISTS servers CASCADE")
            cur.execute("DROP TABLE IF EXISTS users CASCADE")
            cur.execute("DROP TABLE IF EXISTS tenants CASCADE")
            cur.execute("DROP TYPE IF EXISTS role_enum CASCADE")

            # Role enum
            cur.execute("""
                CREATE TYPE role_enum AS ENUM ('superuser', 'manager', 'user')
            """)

            # Tenants
            cur.execute("""
                CREATE TABLE tenants (
                    id                UUID PRIMARY KEY,
                    name              TEXT UNIQUE NOT NULL,
                    subscription_plan TEXT NOT NULL DEFAULT 'free',
                    created_at        TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            # Users
            cur.execute("""
                CREATE TABLE users (
                    id            UUID PRIMARY KEY,
                    email         TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role          role_enum NOT NULL DEFAULT 'user',
                    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
                    created_at    TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            # Servers — platform resources assigned to tenants by superusers
            cur.execute("""
                CREATE TABLE servers (
                    id                 UUID PRIMARY KEY,
                    name               TEXT NOT NULL,
                    server_id          TEXT UNIQUE NOT NULL,
                    tenant_id          UUID REFERENCES tenants(id) ON DELETE SET NULL,
                    worker_url         TEXT,
                    ingest_host        TEXT,
                    ingest_port        INTEGER NOT NULL DEFAULT 1936,
                    ome_url            TEXT,
                    status             TEXT NOT NULL DEFAULT 'unknown',
                    last_heartbeat_at  TIMESTAMPTZ,
                    server_token_hash  TEXT,
                    created_at         TIMESTAMPTZ DEFAULT NOW()
                )
            """)


def migrate_db():
    """Idempotent, additive schema migrations for existing databases."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.servers')")
            if cur.fetchone()[0] is None:
                return  # schema not created yet; init_db() will create it fully
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS worker_url TEXT")
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS ingest_host TEXT")
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS ingest_port INTEGER NOT NULL DEFAULT 1936")
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS ome_url TEXT")
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unknown'")
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ")
            cur.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS server_token_hash TEXT")
