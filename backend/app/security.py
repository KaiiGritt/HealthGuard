"""Password hashing (stdlib pbkdf2) and JWT tokens (PyJWT).

Password hashing uses hashlib.pbkdf2_hmac — no native deps, works on any Python
(including 3.14 where bcrypt/passlib wheels can be missing). Hash format:
    pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from .config import settings

_ALGORITHM = "HS256"
_PBKDF2_ITERATIONS = 240_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters_s, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters_s)
        )
        # Constant-time comparison to avoid timing attacks.
        return hmac.compare_digest(digest.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def create_access_token(*, user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(days=settings.jwt_expire_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Return the decoded payload, or None if invalid/expired."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return None
