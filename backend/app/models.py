"""SQLAlchemy ORM models for the assessment vertical slice.

Only the tables needed for the symptom -> triage -> history flow are defined here.
`users`, `symptoms`, and `triage_rules` (from the full proposal) are added in the
auth/admin sessions; `assessments.user_id` is already present so they bolt on cleanly.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    """An account. Roles: 'resident' (self-signup), 'mho', 'admin' (admin-created)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(128))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    barangay: Mapped[str | None] = mapped_column(String(96), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str] = mapped_column(String(191), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="resident", server_default="resident")
    language_preference: Mapped[str | None] = mapped_column(String(16), nullable=True, default="en")
    notification_preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=lambda: {"email": True, "sms": False, "push": True})
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ProfileAuditLog(Base):
    """Minimal audit trail for user profile modifications and security events."""

    __tablename__ = "profile_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    action: Mapped[str] = mapped_column(String(64), default="profile_update", index=True)
    details: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Resident(Base):
    """Diagram-aligned resident profile. Kept separate from the auth user record for clearer role modeling."""

    __tablename__ = "residents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    birthdate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class MHO(Base):
    """Diagram-aligned MHO profile."""

    __tablename__ = "mhos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    position: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Admin(Base):
    """Diagram-aligned admin profile."""

    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    position: Mapped[str | None] = mapped_column(String(64), nullable=True)
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
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PasswordReset(Base):
    """One-time email code used to reset an existing account password."""

    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(191), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(16))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Symptom(Base):
    """Canonical symptom registry aligned with the diagram's Symptom entity."""

    __tablename__ = "symptoms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64), default="general")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    assessment_symptoms: Mapped[list["AssessmentSymptom"]] = relationship(back_populates="symptom")


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
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reviewed_by: Mapped[str | None] = mapped_column(String(191), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RiskLevel(Base):
    """Canonical triage level used by the classification engine."""

    __tablename__ = "risk_levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class GuideLevel(Base):
    """Non-emergency guidance tier that determines medication support."""

    __tablename__ = "guide_levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guide_name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LexiconRuleBase(Base):
    """Diagram-aligned base record for the canonical lexicon rule set."""

    __tablename__ = "lexicon_rule_bases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[str] = mapped_column(String(32), default="1.0")
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    lexicon_rules: Mapped[list["LexiconRule"]] = relationship(back_populates="rule_base")


class LexiconRule(Base):
    """Rule metadata linking a symptom pattern to a risk and medication guidance tier."""

    __tablename__ = "lexicon_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    term: Mapped[str] = mapped_column(String(128), index=True)
    normalized_term: Mapped[str] = mapped_column(String(128), index=True)
    risk_level_id: Mapped[int | None] = mapped_column(ForeignKey("risk_levels.id"), nullable=True)
    guide_level_id: Mapped[int | None] = mapped_column(ForeignKey("guide_levels.id"), nullable=True)
    weight: Mapped[float] = mapped_column(default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    rule_base_id: Mapped[int | None] = mapped_column(ForeignKey("lexicon_rule_bases.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    rule_base: Mapped[LexiconRuleBase | None] = relationship(back_populates="lexicon_rules")


class Assessment(Base):
    """A single completed health assessment and its explainable result."""

    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Nullable until auth lands; associates the assessment with a resident later.
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    input_text: Mapped[str] = mapped_column(Text, default="")
    # 'text' (free text) or 'select' (symptom chips).
    method: Mapped[str] = mapped_column(String(16), default="text")
    # Legacy compatibility: this remains for current API usage while the diagram-aligned relation is added.
    detected_symptoms: Mapped[list] = mapped_column(JSON, default=list)
    # 'GREEN' | 'YELLOW' | 'RED'.
    risk_level: Mapped[str] = mapped_column(String(8), index=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    pre_medications: Mapped[list["PreMedication"]] = relationship(back_populates="assessment")
    assessment_symptoms: Mapped[list["AssessmentSymptom"]] = relationship(back_populates="assessment")


class AssessmentSymptom(Base):
    """Diagram-aligned assessment-to-symptom mapping for normalized symptom tracking."""

    __tablename__ = "assessment_symptoms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), index=True)
    symptom_id: Mapped[int] = mapped_column(ForeignKey("symptoms.id"), index=True)
    matched_text: Mapped[str] = mapped_column(String(128), default="")
    language: Mapped[str] = mapped_column(String(8), default="en")
    category: Mapped[str] = mapped_column(String(64), default="general")
    severity_weight: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    assessment: Mapped[Assessment] = relationship(back_populates="assessment_symptoms")
    symptom: Mapped[Symptom] = relationship(back_populates="assessment_symptoms")


class PreMedication(Base):
    """Medication guidance generated only for non-emergency cases."""

    __tablename__ = "pre_medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), index=True)
    medication_name: Mapped[str] = mapped_column(String(128), default="")
    dosage: Mapped[str] = mapped_column(Text, default="")
    frequency: Mapped[str] = mapped_column(String(64), default="")
    instruction: Mapped[str] = mapped_column(Text, default="")
    caution: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    assessment: Mapped[Assessment] = relationship(back_populates="pre_medications")


class AnalysisReport(Base):
    """Diagram-aligned generated reporting object for administrative review."""

    __tablename__ = "analysis_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    report_type: Mapped[str] = mapped_column(String(32), default="summary")
    parameters: Mapped[str] = mapped_column(Text, default="{}")
    data: Mapped[str] = mapped_column(Text, default="{}")
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
