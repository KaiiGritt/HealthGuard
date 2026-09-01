"""Authentication endpoints: register, login, logout, me, profile."""
from __future__ import annotations

import json
import secrets
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import COOKIE_NAME, get_current_user
from ..email import send_login_alert, send_message, send_password_reset_code, send_verification_code
from ..models import EmailVerification, PasswordReset, ProfileAuditLog, User
from ..schemas import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetRequest,
    PasswordResetVerifyRequest,
    ProfileAuditLogOut,
    ProfileUpdate,
    RegisterRequest,
    RegisterResponse,
    UserOut,
    VerifyEmailRequest,
)
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
PASSWORD_ATTEMPTS: dict[int, list[datetime]] = {}


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


def _clear_password_attempts(user_id: int) -> None:
    PASSWORD_ATTEMPTS.pop(user_id, None)


def _record_password_attempt(user_id: int, *, success: bool) -> None:
    now = _utc_now()
    attempts = [ts for ts in PASSWORD_ATTEMPTS.get(user_id, []) if now - ts < timedelta(minutes=10)]
    if success:
        attempts.clear()
    else:
        attempts.append(now)
    PASSWORD_ATTEMPTS[user_id] = attempts


def _add_profile_audit(db: Session, user_id: int, action: str, **details: object) -> None:
    db.add(
        ProfileAuditLog(
            user_id=user_id,
            action=action,
            details=json.dumps(details, ensure_ascii=False),
        )
    )


def _require_smtp() -> None:
    if settings.sendgrid_api_key or settings.resend_api_key:
        return
    if not settings.smtp_enabled:
        print("[email] SMTP is disabled; set SMTP_ENABLED=true in the deployment environment")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured. Registration is unavailable.",
        )
    if not (settings.smtp_from_email or settings.admin_email):
        print("[email] SMTP sender is missing; set SMTP_FROM_EMAIL or ADMIN_EMAIL in the deployment environment")
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
            phone_number=payload.phone_number,
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
        pending.phone_number = payload.phone_number

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
        phone_number=record.phone_number,
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
        logger.warning("Sign-in failed: invalid credentials")
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        logger.warning("Sign-in rejected: inactive account")
        raise HTTPException(status_code=403, detail="This account is disabled.")
    _set_auth_cookie(response, user)
    try:
        message = send_login_alert(user.email, None)
        send_message(message)
    except Exception:
        # Login should still succeed even if mail delivery is unavailable.
        logger.exception("Login alert delivery failed")
    logger.info("Sign-in succeeded")
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


@router.get("/profile/audit", response_model=list[ProfileAuditLogOut])
def get_profile_audit(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProfileAuditLog]:
    rows = (
        db.execute(
            select(ProfileAuditLog)
            .where(ProfileAuditLog.user_id == user.id)
            .order_by(ProfileAuditLog.created_at.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )
    return rows


@router.put("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    data = payload.model_dump(exclude_unset=True)
    changes: dict[str, object] = {}
    if "full_name" in data and data["full_name"]:
        previous = user.full_name
        new_value = data["full_name"].strip()
        if previous != new_value:
            user.full_name = new_value
            changes["full_name"] = {"from": previous, "to": new_value}
    for field in ("age", "sex", "barangay", "phone_number", "language_preference"):
        if field in data:
            previous = getattr(user, field)
            new_value = data[field]
            if previous != new_value:
                setattr(user, field, new_value)
                changes[field] = {"from": previous, "to": new_value}
    if "notification_preferences" in data:
        previous = user.notification_preferences or {}
        new_value = data["notification_preferences"]
        if previous != new_value:
            user.notification_preferences = new_value
            changes["notification_preferences"] = {"from": previous, "to": new_value}
    if changes:
        _add_profile_audit(db, user.id, "profile_update", **changes)
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    attempts = [ts for ts in PASSWORD_ATTEMPTS.get(user.id, []) if _utc_now() - ts < timedelta(minutes=10)]
    if len(attempts) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many password attempts. Please wait 10 minutes before trying again.",
        )

    if not verify_password(payload.current_password, user.password_hash):
        _record_password_attempt(user.id, success=False)
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different.")
    user.password_hash = hash_password(payload.new_password)
    _record_password_attempt(user.id, success=True)
    _add_profile_audit(db, user.id, "password_changed", password_changed=True)
    db.commit()
    return {"message": "Password changed successfully."}


@router.post("/deactivate")
def deactivate_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user.is_active = False
    user.is_deleted = True
    user.deleted_at = _utc_now()
    _add_profile_audit(db, user.id, "account_deactivated", deleted_at=user.deleted_at.isoformat())
    db.commit()
    return {"message": "Account deactivated successfully."}
