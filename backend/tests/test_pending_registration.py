from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from starlette.responses import Response

from app.database import Base
from app.models import EmailVerification, User
from app.routers import auth as auth_router
from app.schemas import RegisterRequest, VerifyEmailRequest


class PendingRegistrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, future=True)

    def test_register_does_not_create_user_row(self) -> None:
        db = self.Session()
        payload = RegisterRequest(
            full_name="Jane Resident",
            email="jane@example.com",
            password="password123",
            barangay="Monbon",
        )

        with patch.object(auth_router, "_require_smtp"), patch.object(auth_router, "_send_verification_email"):
            response = auth_router.register(payload, db=db)

        self.assertEqual(response.email, "jane@example.com")
        self.assertEqual(db.scalar(select(User.id)), None)
        pending = db.execute(select(EmailVerification).where(EmailVerification.email == "jane@example.com")).scalar_one()
        self.assertEqual(pending.full_name, "Jane Resident")
        db.close()

    def test_verify_email_creates_active_user(self) -> None:
        db = self.Session()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.add(
            EmailVerification(
                email="jane@example.com",
                code="123456",
                expires_at=expires_at,
                full_name="Jane Resident",
                password_hash="hashed-password",
                age=30,
                sex="female",
                barangay="San Juan",
            )
        )
        db.commit()

        response = auth_router.verify_email(
            VerifyEmailRequest(email="jane@example.com", code="123456"),
            response=Response(),
            db=db,
        )

        self.assertEqual(response.email, "jane@example.com")
        self.assertEqual(response.role, "resident")
        user = db.execute(select(User).where(User.email == "jane@example.com")).scalar_one()
        self.assertTrue(user.is_active)
        self.assertEqual(db.scalar(select(EmailVerification.id)), None)
        db.close()


if __name__ == "__main__":
    unittest.main()
