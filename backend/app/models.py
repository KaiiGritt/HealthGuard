"""SQLAlchemy ORM models for the assessment vertical slice.

Only the tables needed for the symptom -> triage -> history flow are defined here.
`users`, `symptoms`, and `triage_rules` (from the full proposal) are added in the
auth/admin sessions; `assessments.user_id` is already present so they bolt on cleanly.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    """An account. Roles: 'resident' (self-signup), 'mho', 'admin' (admin-created)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(128))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    barangay: Mapped[str | None] = mapped_column(String(96), nullable=True)
    email: Mapped[str] = mapped_column(String(191), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="resident", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class EmailVerification(Base):
    """Pending registration held until the user verifies their email address."""

    __tablename__ = "email_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(191), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(16))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    full_name: Mapped[str] = mapped_column(String(128))
    password_hash: Mapped[str] = mapped_column(String(255))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    barangay: Mapped[str | None] = mapped_column(String(96), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class SymptomLexicon(Base):
    """Two-layer bilingual lexicon entry (Layer 2: custom Filipino/English symptom terms)."""

    __tablename__ = "symptom_lexicon"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # The term as a user might type it, e.g. "lagnat" or "difficulty breathing".
    local_term: Mapped[str] = mapped_column(String(128), index=True)
    # 'en' or 'tl'.
    language: Mapped[str] = mapped_column(String(8))
    # Normalized standard symptom, e.g. "fever".
    medical_term: Mapped[str] = mapped_column(String(128), index=True)
    # Contribution to the triage score (higher = more urgent).
    severity_weight: Mapped[int] = mapped_column(Integer, default=1)
    # Grouping, e.g. "respiratory", "gastrointestinal", "general".
    category: Mapped[str] = mapped_column(String(64), default="general")


class Assessment(Base):
    """A single completed health assessment and its explainable result."""

    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Nullable until auth lands; associates the assessment with a resident later.
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    input_text: Mapped[str] = mapped_column(Text, default="")
    # 'text' (free text) or 'select' (symptom chips).
    method: Mapped[str] = mapped_column(String(16), default="text")
    # List of detected standard symptom terms.
    detected_symptoms: Mapped[list] = mapped_column(JSON, default=list)
    # 'GREEN' | 'YELLOW' | 'RED'.
    risk_level: Mapped[str] = mapped_column(String(8), index=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
