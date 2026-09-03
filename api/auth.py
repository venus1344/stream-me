import os
import time
import uuid

import redis as redis_lib
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pwdlib import PasswordHash

SECRET_KEY = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_HOURS", "24")) * 3600

password_hash = PasswordHash.recommended()  # Argon2 by default
bearer = HTTPBearer()

_redis = None


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return password_hash.verify(plain, hashed)


def get_redis() -> redis_lib.Redis:
    global _redis
    if _redis is None:
        _redis = redis_lib.Redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
    return _redis


def create_token(user_id: str, email: str, role: str = "user", tenant_id: str | None = None) -> str:
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "jti": jti,
        "exp": int(time.time()) + EXPIRE_SECONDS,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    get_redis().setex(f"session:{jti}", EXPIRE_SECONDS, user_id)
    return token


def revoke_token(jti: str) -> None:
    get_redis().delete(f"session:{jti}")


def _decode_and_verify(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    jti = payload.get("jti")
    if not jti or not get_redis().exists(f"session:{jti}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="session expired or revoked")
    return payload


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    payload = _decode_and_verify(credentials.credentials)
    return {
        "id": payload["sub"],
        "email": payload["email"],
        "role": payload.get("role", "user"),
        "tenant_id": payload.get("tenant_id"),
        "jti": payload["jti"],
    }


def require_role(*allowed_roles: str):
    def check_role(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient permissions")
        return current_user
    return check_role


def require_superuser(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "superuser":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="superuser access required")
    return current_user
