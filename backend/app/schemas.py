"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

DISCLAIMER = (
    "This system does not provide a medical diagnosis. It offers a preliminary health "
    "risk classification only. For any medical concern, consult a qualified health worker."
)


class AnalyzeRequest(BaseModel):
    """Symptom submission — free text and/or selected symptom chips."""

    input_text: str = Field(default="", description="Free-text symptoms in English or Tagalog.")
    selected_symptoms: list[str] = Field(
        default_factory=list, description="Standard symptom terms chosen from chips."
    )
    method: str = Field(default="text", description="'text' or 'select'.")
    user_id: int | None = None


class DetectedSymptom(BaseModel):
    medical_term: str
    matched_text: str
    language: str
    category: str
    severity_weight: int


class TriggeredRule(BaseModel):
    name: str
    description: str


class AnalyzeResult(BaseModel):
    """The explainable triage result returned to the frontend."""

    id: int
    risk_level: str
    detected_symptoms: list[DetectedSymptom]
    triggered_rules: list[TriggeredRule]
    reason: str
    recommendation: str
    message: str
    score: int
    input_text: str
    method: str
    created_at: datetime
    disclaimer: str = DISCLAIMER


class AssessmentOut(BaseModel):
    """Compact row for the history table."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    input_text: str
    method: str
    detected_symptoms: list
    risk_level: str
    reason: str
    recommendation: str
    created_at: datetime


class DashboardMetric(BaseModel):
    label: str
    value: str
    hint: str


class DashboardAssessmentItem(BaseModel):
    id: int
    resident_name: str
    barangay: str | None = None
    risk_level: str
    note: str
    created_at: datetime


class TriageBreakdownItem(BaseModel):
    level: str
    value: int


class WeeklyTrendItem(BaseModel):
    label: str
    date: str
    count: int


class BarangayStatItem(BaseModel):
    barangay: str
    total: int
    urgent: int
    follow_up: int


class SymptomStatItem(BaseModel):
    symptom: str
    count: int


class MethodBreakdownItem(BaseModel):
    method: str
    label: str
    count: int


class DashboardInsightItem(BaseModel):
    title: str
    detail: str
    tone: str = "neutral"


class DashboardReferenceItem(BaseModel):
    title: str
    detail: str
    status: str


class DashboardSummaryOut(BaseModel):
    summary_cards: list[DashboardMetric]
    recent_assessments: list[DashboardAssessmentItem]
    triage_breakdown: list[TriageBreakdownItem]
    weekly_trend: list[WeeklyTrendItem]
    barangay_stats: list[BarangayStatItem]
    top_symptoms: list[SymptomStatItem]
    method_breakdown: list[MethodBreakdownItem]
    insights: list[DashboardInsightItem]
    reference_guides: list[DashboardReferenceItem]
    generated_at: datetime


class AdminActivityItem(BaseModel):
    title: str
    detail: str


class AdminToolItem(BaseModel):
    title: str
    body: str


class AdminSummaryOut(BaseModel):
    summary_cards: list[DashboardMetric]
    recent_activity: list[AdminActivityItem]
    admin_tools: list[AdminToolItem]


class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    barangay: str | None = None
    created_at: datetime


class AdminLexiconItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    local_term: str
    language: str
    medical_term: str
    severity_weight: int
    category: str


class AdminRuleItem(BaseModel):
    name: str
    severity: str
    condition: str
    action: str


class AdminSettingItem(BaseModel):
    key: str
    label: str
    value: str
    status: str


class AdminPrivacyItem(BaseModel):
    title: str
    detail: str
    status: str


class AdminModulesOut(BaseModel):
    users: list[AdminUserItem]
    lexicon_entries: list[AdminLexiconItem]
    triage_rules: list[AdminRuleItem]
    system_settings: list[AdminSettingItem]
    privacy_controls: list[AdminPrivacyItem]


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: str


class LexiconCreateRequest(BaseModel):
    local_term: str = Field(min_length=1, max_length=128)
    language: str = Field(default="en", max_length=8)
    medical_term: str = Field(min_length=1, max_length=128)
    severity_weight: int = Field(default=1, ge=0, le=10)
    category: str = Field(default="general", max_length=64)


# --- Auth ---


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=128)
    email: str = Field(min_length=3, max_length=191)
    password: str = Field(min_length=8, max_length=128)
    age: int | None = Field(default=None, ge=0, le=150)
    sex: str | None = Field(default=None, max_length=16)
    barangay: str = Field(min_length=1, max_length=96)


class RegisterResponse(BaseModel):
    email: str
    message: str


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=191)


class PasswordResetVerifyRequest(BaseModel):
    email: str = Field(min_length=3, max_length=191)
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=128)
    age: int | None = Field(default=None, ge=0, le=150)
    sex: str | None = Field(default=None, max_length=16)
    barangay: str | None = Field(default=None, max_length=96)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    age: int | None = None
    sex: str | None = None
    barangay: str | None = None
    created_at: datetime
