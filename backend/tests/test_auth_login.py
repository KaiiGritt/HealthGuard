from __future__ import annotations

from unittest.mock import Mock

from fastapi import Response
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import User
from app.routers import auth
from app.schemas import LoginRequest


def test_login_does_not_send_email(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    email = "login-background@example.test"
    auth.LOGIN_ATTEMPTS.pop(email, None)
    try:
        with Session(engine) as db:
            user = User(
                full_name="Test Resident",
                email=email,
                password_hash="test-hash",
                role="resident",
                is_active=True,
            )
            db.add(user)
            db.commit()
            monkeypatch.setattr(auth, "verify_password", lambda _password, _stored: True)
            monkeypatch.setattr(auth, "password_needs_rehash", lambda _stored: False)
            send_message = Mock(return_value=True)
            monkeypatch.setattr(auth, "send_message", send_message)

            result = auth.login(
                LoginRequest(email=email, password="correct-password"),
                Response(),
                db,
            )

            assert result.id == user.id
            send_message.assert_not_called()
    finally:
        auth.LOGIN_ATTEMPTS.pop(email, None)
        engine.dispose()
