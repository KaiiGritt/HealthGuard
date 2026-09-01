"""FastAPI authentication dependencies."""
from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_token

COOKIE_NAME = "access_token"


def _extract_token(request: Request) -> str | None:
    """Prefer the httpOnly cookie; fall back to an Authorization: Bearer header."""
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def get_current_user_optional(
    request: Request, db: Session = Depends(get_db)
) -> User | None:
    """Return the authenticated user, or None if not logged in / invalid token."""
    token = _extract_token(request)
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    user = db.get(User, int(sub))
    if user is None or not user.is_active or user.is_deleted:
        return None
    return user


def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Require an authenticated user; raise 401 otherwise."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def require_role(*roles: str) -> Callable[..., User]:
    """Dependency factory: require the current user to have one of `roles`."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return checker
