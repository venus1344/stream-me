from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import migrate_db
from routes.auth import router as auth_router
from routes.servers import router as servers_router
from routes.users import router as users_router
from routes.tenants import router as tenants_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    migrate_db()
    yield


app = FastAPI(
    title="Beamcast Platform API",
    description="""
## Beamcast Central Platform API

Multi-tenant live-streaming control plane. Handles authentication, user management, tenant isolation, and server resource allocation.

### Authentication
All endpoints except `/api/auth/login` and `/api/auth/signup` require a **Bearer token**.

After login, copy the `token` from the response and click **Authorize** (top right), then paste it as:
```
Bearer <your_token_here>
```

### Roles
| Role | Description |
|------|-------------|
| `superuser` | Platform admin — full access across all tenants |
| `manager` | Tenant admin — manages their own tenant and members |
| `user` | Limited — view only within their tenant |
""",
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": "Beamcast", "email": "admin@beamcast.local"},
    license_info={"name": "Proprietary"},
    openapi_tags=[
        {"name": "auth",    "description": "Login, signup, token management"},
        {"name": "users",   "description": "User listing and invite management"},
        {"name": "servers", "description": "Server resource registration and assignment"},
        {"name": "tenants", "description": "Tenant management (SuperUser only)"},
        {"name": "health",  "description": "Service health"},
    ],
)

app.include_router(auth_router)
app.include_router(servers_router)
app.include_router(users_router)
app.include_router(tenants_router)


@app.get("/healthz", tags=["health"], summary="Health check")
def healthz():
    """Returns `{ok: true}` when the service is running."""
    return {"ok": True}
