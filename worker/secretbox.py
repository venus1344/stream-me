"""Field-level encryption for destination keys stored in the worker's sqlite DB.

Uses AES-256-GCM. The key is read from SECRET_ENCRYPTION_KEY (base64-encoded
32 bytes; generate with: `openssl rand -base64 32`).

When the key is unset, encrypt()/decrypt() are no-ops, preserving the legacy
plaintext behavior (safe rollout). Ciphertext is prefixed so legacy plaintext
values in an existing DB are still readable after enabling encryption.

Ciphertext format:  enc:v1:<base64 nonce>:<base64 ciphertext+tag>
"""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_PREFIX = "enc:v1:"
_KEY = os.environ.get("SECRET_ENCRYPTION_KEY", "").strip()


def _aesgcm():
    if not _KEY:
        return None
    try:
        key = base64.b64decode(_KEY)
    except Exception:
        return None
    if len(key) != 32:
        return None
    return AESGCM(key)


def encrypt(plaintext: str) -> str:
    if not plaintext:
        return plaintext
    aesgcm = _aesgcm()
    if aesgcm is None:
        return plaintext
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return _PREFIX + base64.b64encode(nonce).decode() + ":" + base64.b64encode(ct).decode()


def decrypt(value: str) -> str:
    if not value or not value.startswith(_PREFIX):
        return value
    aesgcm = _aesgcm()
    if aesgcm is None:
        return value
    try:
        rest = value[len(_PREFIX):]
        nonce_b64, ct_b64 = rest.split(":", 1)
        nonce = base64.b64decode(nonce_b64)
        ct = base64.b64decode(ct_b64)
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception:
        return value
