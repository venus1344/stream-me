#!/usr/bin/env python3
"""
Initialize the database and create an admin superuser.

Usage:
  python init_admin.py <email> <password>

Example:
  python init_admin.py admin@beamcast.local supersecurepassword
"""

import sys
from database import get_db, init_db
from auth import hash_password
from utils.uuid7 import uuid7


def init_admin(email: str, password: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Check if admin already exists
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                print(f"❌ User {email} already exists")
                return False

            # Create the first (system) tenant — superusers belong here
            tenant_id = uuid7()
            cur.execute(
                "INSERT INTO tenants (id, name, subscription_plan) VALUES (%s, %s, %s)",
                (tenant_id, "Default", "free"),
            )

            # Create superuser belonging to the first tenant
            user_id = uuid7()
            cur.execute(
                """INSERT INTO users (id, email, password_hash, role, tenant_id)
                   VALUES (%s, %s, %s, 'superuser', %s)""",
                (user_id, email.lower(), hash_password(password), tenant_id),
            )

    print(f"✅ Created superuser : {email}  (id={user_id})")
    print(f"✅ System tenant     : Default  (id={tenant_id})")
    return True


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    email, password = sys.argv[1], sys.argv[2]

    if not email or not password:
        print("❌ Email and password are required")
        sys.exit(1)

    try:
        print("Initializing database schema (drop + recreate)...")
        init_db()
        init_admin(email, password)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
