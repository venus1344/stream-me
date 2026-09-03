import psycopg2.errors
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user, require_superuser
from database import get_db
from models.server import CreateServerRequest, ServerResponse
from utils.uuid7 import uuid7

router = APIRouter(prefix="/api/servers", tags=["servers"])

_SERVER_EXAMPLE = {
    "id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b",
    "name": "NYC Edge 01",
    "serverId": "nyc-edge-01",
    "tenantId": "018f1a2b-0000-7000-8000-000000000001",
    "createdAt": "2025-01-15T10:30:00+00:00",
}


@router.get(
    "",
    response_model=list[ServerResponse],
    summary="List servers visible to the current user",
    responses={
        200: {
            "description": "List of servers",
            "content": {"application/json": {"example": [_SERVER_EXAMPLE]}},
        },
        401: {"description": "Not authenticated"},
    },
)
def list_servers(current_user: dict = Depends(get_current_user)):
    """
    Returns servers scoped by role:

    - **SuperUser** → all servers on the platform
    - **Manager / User** → only servers assigned to their tenant
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            if current_user["role"] == "superuser":
                cur.execute(
                    "SELECT id, name, server_id, tenant_id, created_at FROM servers ORDER BY created_at"
                )
            else:
                cur.execute(
                    "SELECT id, name, server_id, tenant_id, created_at FROM servers "
                    "WHERE tenant_id = %s ORDER BY created_at",
                    (current_user["tenant_id"],),
                )
            rows = cur.fetchall()
    return [
        {"id": str(r[0]), "name": r[1], "serverId": r[2],
         "tenantId": str(r[3]) if r[3] else None, "createdAt": r[4].isoformat()}
        for r in rows
    ]


@router.post(
    "",
    status_code=201,
    response_model=ServerResponse,
    summary="Register a new server  [SuperUser only]",
    responses={
        201: {"description": "Server registered", "content": {"application/json": {"example": _SERVER_EXAMPLE}}},
        400: {"description": "server_id already taken"},
        403: {"description": "SuperUser access required"},
    },
)
def create_server(body: CreateServerRequest, current_user: dict = Depends(require_superuser)):
    """
    Register a new platform server resource.

    - `server_id` must be a unique slug (e.g. `nyc-edge-01`).
    - Optionally pass `tenant_id` to assign it to a tenant immediately.
    - **SuperUser only.**
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            try:
                server_id = uuid7()
                cur.execute(
                    "INSERT INTO servers (id, name, server_id, tenant_id) "
                    "VALUES (%s, %s, %s, %s) RETURNING id, name, server_id, tenant_id, created_at",
                    (server_id, body.name, body.server_id, body.tenant_id),
                )
                row = cur.fetchone()
            except psycopg2.errors.UniqueViolation:
                raise HTTPException(400, "server_id already registered")
    return {"id": str(row[0]), "name": row[1], "serverId": row[2],
            "tenantId": str(row[3]) if row[3] else None, "createdAt": row[4].isoformat()}


@router.post(
    "/{server_id}/assign",
    summary="Assign a server to a tenant  [SuperUser only]",
    responses={
        200: {"description": "Assignment updated", "content": {"application/json": {"example": {"ok": True}}}},
        404: {"description": "Server not found"},
        403: {"description": "SuperUser access required"},
    },
)
def assign_server(
    server_id: str,
    tenant_id: str,
    current_user: dict = Depends(require_superuser),
):
    """
    Assign (or reassign) a server to a tenant.

    - `server_id` is the slug (e.g. `nyc-edge-01`), not the UUID.
    - `tenant_id` is the tenant's UUID.
    - **SuperUser only.**
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE servers SET tenant_id = %s WHERE server_id = %s",
                (tenant_id, server_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "server not found")
    return {"ok": True}


@router.delete(
    "/{server_id}",
    summary="Delete a server  [SuperUser only]",
    responses={
        200: {"description": "Server deleted", "content": {"application/json": {"example": {"ok": True}}}},
        404: {"description": "Server not found"},
        403: {"description": "SuperUser access required"},
    },
)
def delete_server(server_id: str, current_user: dict = Depends(require_superuser)):
    """
    Permanently delete a server by its slug.

    - `server_id` is the slug (e.g. `nyc-edge-01`), not the UUID.
    - **SuperUser only.**
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM servers WHERE server_id = %s", (server_id,))
            if cur.rowcount == 0:
                raise HTTPException(404, "server not found")
    return {"ok": True}
