import psycopg2.errors
from fastapi import APIRouter, Depends, HTTPException

from auth import create_token, get_current_user, require_superuser, hash_password, revoke_token, verify_password
from database import get_db
from models.user import SignupRequest, LoginRequest, UserResponse
from utils.uuid7 import uuid7

router = APIRouter(prefix="/api/auth", tags=["auth"])

_TOKEN_EXAMPLE = {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {"id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b", "email": "alice@acme.com", "role": "manager"},
}


@router.post(
    "/signup",
    status_code=201,
    summary="Sign up as a new Tenant Manager",
    response_description="JWT token + new user object",
    responses={
        201: {"description": "Account created", "content": {"application/json": {"example": _TOKEN_EXAMPLE}}},
        400: {"description": "Email already registered or password too short"},
    },
)
def signup(body: SignupRequest):
    """
    Create a new **Manager** account with its own isolated tenant.

    - A new tenant is created automatically using the email prefix as the tenant name.
    - The returned token can be used immediately.
    - **Role assigned:** `manager`
    """
    if len(body.password) < 8:
        raise HTTPException(400, "password must be at least 8 characters")
    if not any(c.isdigit() for c in body.password):
        raise HTTPException(400, "password must include at least one number")
    if not any(c.isupper() for c in body.password):
        raise HTTPException(400, "password must include at least one uppercase letter")
    if not any(c in "!@#$%^&*()-_=+[]{}:;,.?" for c in body.password):
        raise HTTPException(400, "password must include at least one special character")
    with get_db() as conn:
        with conn.cursor() as cur:
            try:
                tenant_id = uuid7()
                tenant_name = body.email.split("@")[0].title()
                cur.execute(
                    "INSERT INTO tenants (id, name) VALUES (%s, %s)",
                    (tenant_id, tenant_name),
                )
                user_id = uuid7()
                cur.execute(
                    "INSERT INTO users (id, email, password_hash, role, tenant_id) "
                    "VALUES (%s, %s, %s, 'manager', %s) RETURNING email, role",
                    (user_id, body.email.lower(), hash_password(body.password), tenant_id),
                )
                email, role = cur.fetchone()
            except psycopg2.errors.UniqueViolation:
                raise HTTPException(400, "email already registered")
    user = {"id": user_id, "email": email, "role": role}
    return {"token": create_token(user_id, email, role, tenant_id), "user": user}


@router.post(
    "/login",
    summary="Log in and get a JWT token",
    response_description="JWT token + user object",
    responses={
        200: {"description": "Login successful", "content": {"application/json": {"example": _TOKEN_EXAMPLE}}},
        401: {"description": "Invalid email or password"},
    },
)
def login(body: LoginRequest):
    """
    Authenticate with email + password.

    Returns a **JWT bearer token** — include it in subsequent requests as:
    ```
    Authorization: Bearer <token>
    ```
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash, role, tenant_id FROM users WHERE email = %s",
                (body.email.lower(),),
            )
            row = cur.fetchone()
    if not row or not verify_password(body.password, row[2]):
        raise HTTPException(401, "invalid credentials")
    user_id, email, _, role, tenant_id = row
    user = {"id": str(user_id), "email": email, "role": role}
    return {"token": create_token(str(user_id), email, role, str(tenant_id) if tenant_id else None), "user": user}


@router.post(
    "/superuser",
    status_code=201,
    summary="Create a new SuperUser  [SuperUser only]",
    response_description="JWT token + new superuser object",
    responses={
        201: {"description": "SuperUser created"},
        400: {"description": "Email already registered or password too short"},
        403: {"description": "Caller is not a superuser"},
    },
)
def create_superuser(body: SignupRequest, current_user: dict = Depends(require_superuser)):
    """
    Create a new **SuperUser** account. Only callable by an existing SuperUser.

    The new superuser is attached to the **Default** tenant (the first tenant ever created).
    """
    if len(body.password) < 8:
        raise HTTPException(400, "password must be at least 8 characters")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tenants ORDER BY created_at LIMIT 1")
            row = cur.fetchone()
            if not row:
                raise HTTPException(500, "no default tenant found; run init_admin first")
            default_tenant_id = str(row[0])
            try:
                user_id = uuid7()
                cur.execute(
                    "INSERT INTO users (id, email, password_hash, role, tenant_id) "
                    "VALUES (%s, %s, %s, 'superuser', %s) RETURNING email, role",
                    (user_id, body.email.lower(), hash_password(body.password), default_tenant_id),
                )
                email, role = cur.fetchone()
            except psycopg2.errors.UniqueViolation:
                raise HTTPException(400, "email already registered")
    user = {"id": user_id, "email": email, "role": role}
    return {"token": create_token(user_id, email, role, default_tenant_id), "user": user}


@router.post(
    "/logout",
    summary="Revoke the current JWT token",
    responses={
        200: {"description": "Token revoked", "content": {"application/json": {"example": {"ok": True}}}},
        401: {"description": "Token missing or already expired"},
    },
)
def logout(current_user: dict = Depends(get_current_user)):
    """
    Revoke the current session token via Redis JTI blacklist.

    The token becomes invalid immediately even before its natural expiry.
    """
    revoke_token(current_user["jti"])
    return {"ok": True}


@router.get(
    "/me",
    summary="Get the currently authenticated user",
    response_model=UserResponse,
    responses={
        200: {
            "description": "Current user info",
            "content": {"application/json": {"example": {
                "id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b",
                "email": "alice@acme.com",
                "role": "manager",
                "tenantId": "018f1a2b-0000-7000-8000-000000000001",
            }}},
        },
        401: {"description": "Not authenticated"},
    },
)
def me(current_user: dict = Depends(get_current_user)):
    """Return the user info encoded in the current JWT."""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "tenantId": current_user["tenant_id"],
    }
