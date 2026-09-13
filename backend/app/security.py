"""Password hashing and JWT tokens (PyJWT).

New passwords use Argon2id. PBKDF2-SHA256 verification remains for legacy records
so existing accounts can log in and be upgraded without a forced password reset.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

import jwt
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
except ImportError:  # pragma: no cover - dependency is installed in production
    PasswordHasher = None  # type: ignore[assignment,misc]
    InvalidHashError = VerificationError = VerifyMismatchError = Exception  # type: ignore[misc,assignment]

from .config import settings

_ALGORITHM = "HS256"
_PBKDF2_ITERATIONS = 240_000
_ARGON2 = PasswordHasher() if PasswordHasher is not None else None
_COMMON_PASSWORDS = frozenset({
    "password", "password123", "password1", "qwerty", "qwerty123", "admin", "admin123",
    "letmein", "welcome", "welcome123", "iloveyou", "monkey", "abc123", "12345678",
})
_COMMON_PASSWORD_ROOTS = frozenset({"password", "qwerty", "admin", "letmein", "welcome", "iloveyou", "monkey", "abc"})


def validate_password_policy(password: str, identifiers: tuple[str, ...] = ()) -> str:
    """Validate password quality without ever including the secret in an error."""
    requirements = (
        (len(password) >= 8, "at least 8 characters"),
        (bool(re.search(r"[A-Z]", password)), "an uppercase letter"),
        (bool(re.search(r"[a-z]", password)), "a lowercase letter"),
        (bool(re.search(r"\d", password)), "a number"),
        (bool(re.search(r"[^A-Za-z0-9]", password)), "a special character"),
    )
    missing = [description for valid, description in requirements if not valid]
    if missing:
        raise ValueError("Password must include " + ", ".join(missing) + ".")

    normalized = password.casefold()
    account_terms = {term.casefold() for identifier in identifiers for term in _identifier_terms(identifier)}
    if any(term and len(term) >= 3 and term in normalized for term in account_terms):
        raise ValueError("Password must not contain your name, email, username, or other account information.")
    compact = re.sub(r"[^a-z0-9]", "", normalized)
    if normalized in _COMMON_PASSWORDS or any(
        compact.startswith(root) and len(compact) <= len(root) + 8 for root in _COMMON_PASSWORD_ROOTS
    ):
        raise ValueError("Password is too common. Choose a less predictable password.")
    if _is_repeated_or_sequential(password):
        raise ValueError("Password is too predictable. Avoid repeated or sequential characters.")
    return password


def _identifier_terms(identifier: str) -> set[str]:
    normalized = re.sub(r"[^a-zA-Z0-9]+", " ", identifier).casefold()
    parts = set(normalized.split())
    if "@" in identifier:
        parts.add(identifier.split("@", 1)[0].casefold())
    return parts


def _is_repeated_or_sequential(value: str) -> bool:
    if len(value) < 8:
        return False
    compact = "".join(char.casefold() for char in value if char.isalnum())
    if len(compact) < 8:
        return False
    if len(set(compact)) == 1 or max(compact.count(char) for char in set(compact)) / len(compact) >= 0.6:
        return True
    return any(
        all(ord(window[index + 1]) - ord(window[index]) == step for index in range(len(window) - 1))
        for start in range(len(compact) - 7)
        for window in (compact[start : start + 8],)
        for step in (-1, 1)
    )


def hash_password(password: str) -> str:
    if _ARGON2 is not None:
        return _ARGON2.hash(password)
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("$argon2") and _ARGON2 is not None:
        try:
            return _ARGON2.verify(stored, password)
        except (InvalidHashError, VerificationError, VerifyMismatchError):
            return False
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


def password_needs_rehash(stored: str) -> bool:
    return _ARGON2 is not None and not stored.startswith("$argon2")


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
