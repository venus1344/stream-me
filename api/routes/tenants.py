from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_superuser
from database import get_db
from plans import PLANS

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


class SetPlanRequest(BaseModel):
    plan: str

_TENANT_EXAMPLE = {
    "id": "018f1a2b-0000-7000-8000-000000000001",
    "name": "Alice",
    "plan": "free",
    "admin": {"id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b", "email": "alice@acme.com", "role": "manager"},
    "users": [
        {"id": "018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b", "email": "alice@acme.com", "role": "manager"},
        {"id": "018f1a2b-3c4d-7e5f-8a9b-000000000002", "email": "bob@acme.com", "role": "user"},
    ],
    "servers": [
        {"id": "018f1a2b-3c4d-7e5f-8a9b-000000000003", "name": "NYC Edge 01", "serverId": "nyc-edge-01"},
    ],
}


@router.get(
    "",
    summary="List all tenants with members and servers  [SuperUser only]",
    responses={
        200: {
            "description": "Full tenant list with nested users and servers",
            "content": {"application/json": {"example": [_TENANT_EXAMPLE]}},
        },
        403: {"description": "SuperUser access required"},
    },
)
def list_tenants(current_user: dict = Depends(require_superuser)):
    """
    Returns every tenant on the platform, each with:

    - `plan` — subscription plan from the tenants table
    - `admin` — first `manager`-role user found in the tenant
    - `users` — all members
    - `servers` — servers currently assigned to this tenant

    **SuperUser only.**
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, subscription_plan FROM tenants ORDER BY created_at")
            tenant_rows = cur.fetchall()

            result = []
            for t_id, t_name, t_plan in tenant_rows:
                cur.execute("""
                    SELECT id, email, role FROM users
                    WHERE tenant_id = %s ORDER BY created_at
                """, (t_id,))
                users = cur.fetchall()

                cur.execute("""
                    SELECT id, name, server_id, status FROM servers
                    WHERE tenant_id = %s ORDER BY created_at
                """, (t_id,))
                servers = cur.fetchall()

                admin = next(
                    ({"id": str(u[0]), "email": u[1], "role": u[2]} for u in users if u[2] == "manager"),
                    None,
                )

                result.append({
                    "id": str(t_id),
                    "name": t_name,
                    "plan": t_plan,
                    "admin": admin,
                    "users": [{"id": str(u[0]), "email": u[1], "role": u[2]} for u in users],
                    "servers": [{"id": str(s[0]), "name": s[1], "serverId": s[2], "status": s[3]} for s in servers],
                })
    return result


@router.patch(
    "/{tenant_id}/plan",
    summary="Set a tenant's subscription plan  [SuperUser only]",
    responses={
        200: {"description": "Plan updated"},
        400: {"description": "Unknown plan"},
        403: {"description": "SuperUser access required"},
        404: {"description": "Tenant not found"},
    },
)
def set_tenant_plan(tenant_id: str, body: SetPlanRequest, current_user: dict = Depends(require_superuser)):
    if body.plan not in PLANS:
        raise HTTPException(400, "unknown plan")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE tenants SET subscription_plan = %s WHERE id = %s", (body.plan, tenant_id))
            if cur.rowcount == 0:
                raise HTTPException(404, "tenant not found")
    return {"ok": True, "plan": body.plan, "limits": PLANS[body.plan]}
