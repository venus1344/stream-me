from pydantic import BaseModel, Field


class CreateServerRequest(BaseModel):
    name: str = Field(..., example="NYC Edge 01")
    server_id: str = Field(..., example="nyc-edge-01", description="Unique slug used to identify this server")
    tenant_id: str | None = Field(None, example="018f1a2b-0000-7000-8000-000000000001",
                                  description="Assign to tenant on creation (optional, SuperUser only)")
    worker_url: str | None = Field(None, example="https://nyc-edge-01.stream.example.com",
                                   description="Public base URL of this server's worker API")
    ingest_host: str | None = Field(None, example="nyc-edge-01.stream.example.com",
                                    description="Host OBS publishes RTMP to")
    ingest_port: int = Field(1936, example=1936, description="RTMP ingest port")
    ome_url: str | None = Field(None, example="https://nyc-edge-01.stream.example.com",
                                description="Public base URL of this server's OME playback")

    model_config = {"json_schema_extra": {"example": {
        "name": "NYC Edge 01", "server_id": "nyc-edge-01", "tenant_id": None,
        "worker_url": "https://nyc-edge-01.stream.example.com",
        "ingest_host": "nyc-edge-01.stream.example.com", "ingest_port": 1936,
        "ome_url": "https://nyc-edge-01.stream.example.com",
    }}}


class ServerResponse(BaseModel):
    id: str = Field(..., example="018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b")
    name: str = Field(..., example="NYC Edge 01")
    serverId: str = Field(..., example="nyc-edge-01")
    tenantId: str | None = Field(None, example="018f1a2b-0000-7000-8000-000000000001")
    workerUrl: str | None = Field(None, example="https://nyc-edge-01.stream.example.com")
    ingestHost: str | None = Field(None, example="nyc-edge-01.stream.example.com")
    ingestPort: int = Field(1936, example=1936)
    ingestUrl: str | None = Field(None, example="rtmp://nyc-edge-01.stream.example.com:1936/stream")
    streamKey: str = Field("input", example="input")
    omeUrl: str | None = Field(None, example="https://nyc-edge-01.stream.example.com")
    status: str = Field("unknown", example="unknown")
    lastHeartbeatAt: str | None = Field(None, example="2025-01-15T10:30:00+00:00")
    createdAt: str = Field(..., example="2025-01-15T10:30:00+00:00")


class CreateServerResponse(ServerResponse):
    serverToken: str = Field(..., example="<server-token-shown-once>")


class BootstrapRequest(BaseModel):
    server_id: str = Field(..., example="nyc-edge-01")
    token: str = Field(..., description="Server machine token")


class HeartbeatRequest(BaseModel):
    status: str = Field(..., example="healthy", description="Worker-reported status")
    load: dict | None = Field(None, example={"streams": 1, "cpu": 0.4})
