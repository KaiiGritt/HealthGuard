"""Authentication endpoints: register, login, logout, me, profile."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import COOKIE_NAME, get_current_user
from ..email import send_login_alert, send_message, send_password_reset_code, send_verification_code
from ..models import EmailVerification, PasswordReset, User
from ..schemas import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetRequest,
    PasswordResetVerifyRequest,
    ProfileUpdate,
    RegisterRequest,
    RegisterResponse,
    UserOut,
    VerifyEmailRequest,
)
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _set_auth_cookie(response: Response, user: User) -> None:
    token = create_access_token(user_id=user.id, role=user.role)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.jwt_expire_days * 24 * 3600,
        path="/",
    )


def _require_smtp() -> None:
    if not settings.smtp_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured. Registration is unavailable.",
        )
    if not (settings.smtp_from_email or settings.admin_email):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email sender is not configured. Registration is unavailable.",
        )


def _send_verification_email(email: str, code: str) -> None:
    try:
        sent = send_message(send_verification_code(email, code))
    except Exception as exc:
        print(f"[email] verification delivery failed: {type(exc).__name__}: {exc}")
        sent = False
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send verification email. Please try again later.",
        )


def _send_password_reset_email(email: str, code: str) -> None:
    try:
        sent = send_message(send_password_reset_code(email, code))
    except Exception as exc:
        print(f"[email] password reset delivery failed: {type(exc).__name__}: {exc}")
        sent = False
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send password reset email. Please try again later.",
        )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Invalid email address.")

    _require_smtp()

    existing_user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = _utc_now() + timedelta(minutes=10)
    pending = db.execute(select(EmailVerification).where(EmailVerification.email == email)).scalar_one_or_none()

    if pending is None:
        pending = EmailVerification(
            email=email,
            code=code,
            expires_at=expires_at,
            full_name=payload.full_name.strip(),
            password_hash=hash_password(payload.password),
            age=payload.age,
            sex=payload.sex,
            barangay=payload.barangay,
        )
        db.add(pending)
    else:
        pending.code = code
        pending.expires_at = expires_at
        pending.full_name = payload.full_name.strip()
        pending.password_hash = hash_password(payload.password)
        pending.age = payload.age
        pending.sex = payload.sex
        pending.barangay = payload.barangay

    db.flush()
    _send_verification_email(email, code)
    db.commit()

    return RegisterResponse(
        email=email,
        message="Verification code sent. Please check your email to activate your account.",
    )


@router.post("/verify-email", response_model=UserOut)
def verify_email(payload: VerifyEmailRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.strip().lower()
    record = db.execute(select(EmailVerification).where(EmailVerification.email == email)).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Verification code not found.")
    if _as_utc(record.expires_at) < _utc_now():
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=410, detail="Verification code expired.")
    if record.code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    existing_user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing_user is not None:
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        full_name=record.full_name,
        email=email,
        password_hash=record.password_hash,
        role="resident",
        age=record.age,
        sex=record.sex,
        barangay=record.barangay,
        is_active=True,
    )
    db.add(user)
    db.delete(record)
    db.commit()
    db.refresh(user)
    _set_auth_cookie(response, user)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    # Generic error to avoid leaking which emails exist.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is disabled.")
    _set_auth_cookie(response, user)
    try:
        message = send_login_alert(user.email, None)
        send_message(message)
    except Exception:
        # Login should still succeed even if mail delivery is unavailable.
        pass
    return user


@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """Email a reset code without revealing whether the address is registered."""
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Invalid email address.")
    _require_smtp()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is not None:
        code = f"{secrets.randbelow(1_000_000):06d}"
        reset = db.execute(select(PasswordReset).where(PasswordReset.email == email)).scalar_one_or_none()
        if reset is None:
            reset = PasswordReset(email=email, code=code, expires_at=_utc_now() + timedelta(minutes=10))
            db.add(reset)
        else:
            reset.code = code
            reset.expires_at = _utc_now() + timedelta(minutes=10)
        db.flush()
        _send_password_reset_email(email, code)
        db.commit()
    return {"message": "If an account exists for that email, a reset code has been sent."}


@router.post("/reset-password", response_model=UserOut)
def reset_password(payload: PasswordResetVerifyRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.strip().lower()
    reset = db.execute(select(PasswordReset).where(PasswordReset.email == email)).scalar_one_or_none()
    if reset is None or _as_utc(reset.expires_at) < _utc_now():
        if reset is not None:
            db.delete(reset)
            db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    if reset.code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    user.password_hash = hash_password(payload.new_password)
    db.delete(reset)
    db.commit()
    db.refresh(user)
    _set_auth_cookie(response, user)
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"]:
        user.full_name = data["full_name"].strip()
    for field in ("age", "sex", "barangay"):
        if field in data:
            setattr(user, field, data[field])
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}
