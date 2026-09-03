from pydantic import BaseModel, Field


class CreateServerRequest(BaseModel):
    name: str = Field(..., example="NYC Edge 01")
    server_id: str = Field(..., example="nyc-edge-01", description="Unique slug used to identify this server")
    tenant_id: str | None = Field(None, example="018f1a2b-0000-7000-8000-000000000001",
                                  description="Assign to tenant on creation (optional, SuperUser only)")

    model_config = {"json_schema_extra": {"example": {"name": "NYC Edge 01", "server_id": "nyc-edge-01", "tenant_id": None}}}


class ServerResponse(BaseModel):
    id: str = Field(..., example="018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b")
    name: str = Field(..., example="NYC Edge 01")
    serverId: str = Field(..., example="nyc-edge-01")
    tenantId: str | None = Field(None, example="018f1a2b-0000-7000-8000-000000000001")
    createdAt: str = Field(..., example="2025-01-15T10:30:00+00:00")
