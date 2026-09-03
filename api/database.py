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
                    id          UUID PRIMARY KEY,
                    name        TEXT NOT NULL,
                    server_id   TEXT UNIQUE NOT NULL,
                    tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
                    created_at  TIMESTAMPTZ DEFAULT NOW()
                )
            """)
