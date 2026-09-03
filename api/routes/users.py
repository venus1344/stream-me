import re

import psycopg2.errors
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from auth import get_current_user, hash_password
from database import get_db
from utils.uuid7 import uuid7

router = APIRouter(prefix="/api/users", tags=["users"])

_USER_EXAMPLE = {"id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b", "email": "alice@acme.com",
                 "role": "user", "tenantId": "018f1a2b-0000-7000-8000-000000000001", "tenantName": "Alice"}


class InviteRequest(BaseModel):
    email: str = Field(..., example="newmember@acme.com")
    password: str = Field("changeme123", example="changeme123",
                          description="Temporary password — user should change on first login")

    model_config = {"json_schema_extra": {"example": {"email": "newmember@acme.com", "password": "changeme123"}}}

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("invalid email address")
        return v.lower()


@router.get(
    "",
    summary="List users",
    responses={
        200: {"description": "User list", "content": {"application/json": {"example": [_USER_EXAMPLE]}}},
        401: {"description": "Not authenticated"},
    },
)
def list_users(current_user: dict = Depends(get_current_user)):
    """
    Returns users scoped by role:

    - **SuperUser** → all users on the platform, with tenant name
    - **Manager / User** → only members of their own tenant
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            if current_user["role"] == "superuser":
                cur.execute("""
                    SELECT u.id, u.email, u.role, u.tenant_id, t.name
                    FROM users u
                    LEFT JOIN tenants t ON t.id = u.tenant_id
                    ORDER BY u.created_at
                """)
            else:
                cur.execute("""
                    SELECT u.id, u.email, u.role, u.tenant_id, t.name
                    FROM users u
                    LEFT JOIN tenants t ON t.id = u.tenant_id
                    WHERE u.tenant_id = %s
                    ORDER BY u.created_at
                """, (current_user["tenant_id"],))
            rows = cur.fetchall()
    return [
        {"id": str(r[0]), "email": r[1], "role": r[2],
         "tenantId": str(r[3]) if r[3] else None, "tenantName": r[4]}
        for r in rows
    ]


@router.post(
    "/invite",
    status_code=201,
    summary="Invite a new member to the current tenant  [Manager / SuperUser]",
    responses={
        201: {"description": "User invited", "content": {"application/json": {
            "example": {"id": "018f...", "email": "newmember@acme.com", "role": "user"}}}},
        400: {"description": "Email already registered"},
        403: {"description": "Insufficient permissions"},
    },
)
def invite_user(body: InviteRequest, current_user: dict = Depends(get_current_user)):
    """
    Invite a new `user` into the caller's tenant.

    - Creates the account immediately with a temporary password.
    - **Manager or SuperUser only.**
    """
    if current_user["role"] not in ("superuser", "manager"):
        raise HTTPException(403, "insufficient permissions")

    tenant_id = current_user["tenant_id"]
    with get_db() as conn:
        with conn.cursor() as cur:
            try:
                user_id = uuid7()
                cur.execute(
                    "INSERT INTO users (id, email, password_hash, role, tenant_id) "
                    "VALUES (%s, %s, %s, 'user', %s) RETURNING email, role",
                    (user_id, body.email.lower(), hash_password(body.password), tenant_id),
                )
                email, role = cur.fetchone()
            except psycopg2.errors.UniqueViolation:
                raise HTTPException(400, "email already registered")
    return {"id": user_id, "email": email, "role": role}


@router.delete(
    "/{user_id}",
    summary="Remove a user",
    responses={
        200: {"description": "User removed", "content": {"application/json": {"example": {"ok": True}}}},
        403: {"description": "Insufficient permissions"},
        404: {"description": "User not found"},
    },
)
def remove_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a user account.

    - **Manager** → can only remove users within their own tenant
    - **SuperUser** → can remove any user
    """
    if current_user["role"] not in ("superuser", "manager"):
        raise HTTPException(403, "insufficient permissions")

    with get_db() as conn:
        with conn.cursor() as cur:
            if current_user["role"] == "superuser":
                cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            else:
                cur.execute(
                    "DELETE FROM users WHERE id = %s AND tenant_id = %s",
                    (user_id, current_user["tenant_id"]),
                )
            if cur.rowcount == 0:
                raise HTTPException(404, "user not found")
    return {"ok": True}
