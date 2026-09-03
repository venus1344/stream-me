import psycopg2.errors
from fastapi import APIRouter, Depends, Header, HTTPException

from auth import get_current_user, generate_server_token, hash_password, require_superuser, verify_password
from database import get_db
from plans import plan_limits
from models.server import (
    BootstrapRequest,
    CreateServerRequest,
    CreateServerResponse,
    HeartbeatRequest,
    ServerResponse,
)
from utils.uuid7 import uuid7

router = APIRouter(prefix="/api/servers", tags=["servers"])

_SERVER_EXAMPLE = {
    "id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b",
    "name": "NYC Edge 01",
    "serverId": "nyc-edge-01",
    "tenantId": "018f1a2b-0000-7000-8000-000000000001",
    "createdAt": "2025-01-15T10:30:00+00:00",
}

_SERVER_COLUMNS = (
    "id, name, server_id, tenant_id, worker_url, ingest_host, ingest_port, "
    "ome_url, status, last_heartbeat_at, server_token_hash, created_at"
)


def _server_dict(row) -> dict:
    return {
        "id": str(row[0]),
        "name": row[1],
        "serverId": row[2],
        "tenantId": str(row[3]) if row[3] else None,
        "workerUrl": row[4],
        "ingestHost": row[5],
        "ingestPort": row[6],
        "ingestUrl": f"rtmp://{row[5]}:{row[6]}/stream" if row[5] else None,
        "streamKey": "input",
        "omeUrl": row[7],
        "status": row[8],
        "lastHeartbeatAt": row[9].isoformat() if row[9] else None,
        "createdAt": row[11].isoformat() if row[11] else None,
    }


def _fetch_server(server_id: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT {_SERVER_COLUMNS} FROM servers WHERE server_id = %s", (server_id,))
            return cur.fetchone()


def _verify_server_token(server_id: str, token: str):
    row = _fetch_server(server_id)
    if not row:
        raise HTTPException(404, "server not found")
    if not row[10] or not token or not verify_password(token, row[10]):
        raise HTTPException(401, "invalid server token")
    return row


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
                cur.execute(f"SELECT {_SERVER_COLUMNS} FROM servers ORDER BY created_at")
            else:
                cur.execute(
                    f"SELECT {_SERVER_COLUMNS} FROM servers WHERE tenant_id = %s ORDER BY created_at",
                    (current_user["tenant_id"],),
                )
            rows = cur.fetchall()
    return [_server_dict(r) for r in rows]


@router.post(
    "",
    status_code=201,
    response_model=CreateServerResponse,
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
    token = generate_server_token()
    token_hash = hash_password(token)
    with get_db() as conn:
        with conn.cursor() as cur:
            try:
                server_id = uuid7()
                cur.execute(
                    "INSERT INTO servers (id, name, server_id, tenant_id, worker_url, ingest_host, ingest_port, ome_url, server_token_hash) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) "
                    "RETURNING id, name, server_id, tenant_id, worker_url, ingest_host, ingest_port, ome_url, status, created_at",
                    (server_id, body.name, body.server_id, body.tenant_id, body.worker_url, body.ingest_host, body.ingest_port, body.ome_url, token_hash),
                )
                row = cur.fetchone()
            except psycopg2.errors.UniqueViolation:
                raise HTTPException(400, "server_id already registered")
    return {
        "id": str(row[0]), "name": row[1], "serverId": row[2],
        "tenantId": str(row[3]) if row[3] else None,
        "workerUrl": row[4], "ingestHost": row[5], "ingestPort": row[6],
        "omeUrl": row[7], "status": row[8],
        "createdAt": row[9].isoformat() if row[9] else None,
        "serverToken": token,
    }


@router.post(
    "/bootstrap",
    summary="Worker bootstraps its tenant assignment  [server token]",
    responses={
        200: {"description": "Tenant assignment + routing config"},
        401: {"description": "Invalid server token"},
        404: {"description": "Server not found"},
    },
)
def bootstrap_server(body: BootstrapRequest):
    """Called by a worker at startup using its machine token."""
    row = _verify_server_token(body.server_id, body.token)
    tenant_id = row[3]
    ingest_host = row[5]
    ingest_port = row[6]
    plan = "free"
    if tenant_id:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT subscription_plan FROM tenants WHERE id = %s", (tenant_id,))
                r = cur.fetchone()
                if r:
                    plan = r[0]
    return {
        "server_id": row[2],
        "tenant_id": str(tenant_id) if tenant_id else None,
        "plan": plan,
        "limits": plan_limits(plan),
        "ingest_host": ingest_host,
        "ingest_port": ingest_port,
        "ingest_url": f"rtmp://{ingest_host}:{ingest_port}/stream" if ingest_host else None,
        "stream_key": "input",
        "worker_url": row[4],
        "ome_url": row[7],
        "status": row[8],
    }


@router.get(
    "/current",
    response_model=list[ServerResponse],
    summary="Routing info for the caller's tenant",
)
def current_server(current_user: dict = Depends(get_current_user)):
    """Returns the servers assigned to the caller's tenant (for frontend routing)."""
    if current_user["role"] == "superuser":
        return []
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {_SERVER_COLUMNS} FROM servers WHERE tenant_id = %s ORDER BY created_at",
                (current_user["tenant_id"],),
            )
            rows = cur.fetchall()
    return [_server_dict(r) for r in rows]


@router.get(
    "/{server_id}/assignment",
    summary="Worker polls its tenant assignment  [server token]",
    responses={401: {"description": "Invalid server token"}, 404: {"description": "Server not found"}},
)
def get_server_assignment(server_id: str, x_server_token: str | None = Header(default=None)):
    row = _verify_server_token(server_id, x_server_token or "")
    return {"server_id": row[2], "tenant_id": str(row[3]) if row[3] else None}


@router.post(
    "/{server_id}/heartbeat",
    summary="Worker reports status/load  [server token]",
    responses={401: {"description": "Invalid server token"}, 404: {"description": "Server not found"}},
)
def server_heartbeat(server_id: str, body: HeartbeatRequest, x_server_token: str | None = Header(default=None)):
    _verify_server_token(server_id, x_server_token or "")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE servers SET status = %s, last_heartbeat_at = NOW() WHERE server_id = %s",
                (body.status, server_id),
            )
    return {"ok": True}


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
