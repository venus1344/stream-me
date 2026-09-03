import re

from pydantic import BaseModel, Field, field_validator


def _validate_email(v: str) -> str:
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
        raise ValueError("invalid email address")
    return v.lower()


class SignupRequest(BaseModel):
    email: str = Field(..., example="alice@acme.com")
    password: str = Field(..., min_length=8, example="supersecret123")

    model_config = {"json_schema_extra": {"example": {"email": "alice@acme.com", "password": "supersecret123"}}}

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


class LoginRequest(BaseModel):
    email: str = Field(..., example="admin@beamcast.local")
    password: str = Field(..., example="supersecurepassword")

    model_config = {"json_schema_extra": {"example": {"email": "admin@beamcast.local", "password": "supersecurepassword"}}}

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


class UserResponse(BaseModel):
    id: str = Field(..., example="018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b")
    email: str = Field(..., example="alice@acme.com")
    role: str = Field(..., example="manager")


class UserWithTenantResponse(BaseModel):
    id: str = Field(..., example="018f1a2b-3c4d-7e5f-8a9b-0c1d2e3f4a5b")
    email: str = Field(..., example="alice@acme.com")
    role: str = Field(..., example="manager")
    tenantId: str | None = Field(None, example="018f1a2b-0000-7000-8000-000000000001")
