"""Pydantic request/response schemas."""
from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    duration_days: float | None = Field(default=None, ge=0, le=365, description="How many days symptoms have been present.")
    age: int | None = Field(default=None, ge=0, le=150, description="Patient age for risk weighting.")
    sex: str | None = Field(default=None, max_length=16, description="Patient sex for contextual risk weighting.")
    pregnant: bool = Field(default=False, description="Whether the patient is pregnant or recently postpartum.")
    temperature_c: float | None = Field(default=None, ge=25, le=45, description="Temperature in degrees Celsius.")
    oxygen_saturation: float | None = Field(default=None, ge=50, le=100, description="Pulse oximeter reading as a percentage.")
    heart_rate: int | None = Field(default=None, ge=20, le=250, description="Heart rate in beats per minute.")
    systolic_bp: int | None = Field(default=None, ge=50, le=250, description="Systolic blood pressure in mmHg.")
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


class PreMedicationOut(BaseModel):
    """Medication guidance generated for non-emergency assessments."""

    medication_name: str
    dosage: str
    contraindications: list[str]
    side_effects: list[str]
    precautions: list[str]
    note: str


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
    pre_medication: PreMedicationOut | None = None


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
    triggered_rules: list[TriggeredRule] = Field(default_factory=list)
    created_at: datetime
    pre_medication: PreMedicationOut | None = None


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
    phone_number: str | None = None
    handled: bool = False
    handled_at: datetime | None = None


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
    reviewed: bool = False
    review_status: str = "pending"
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None


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


VALID_SEX_VALUES = {"female", "male", "other", "prefer not to say"}
VALID_LANGUAGE_VALUES = {"en", "fil", "both"}
VALID_BARANGAYS = {
    "Bacolod",
    "Bagsangan",
    "Batang",
    "Bolos",
    "Buenavista",
    "Bulawan",
    "Carriedo",
    "Casini",
    "Cawayan",
    "Cogon",
    "Gabao",
    "Gulang-Gulang",
    "Gumapia",
    "Liang",
    "Macawayan",
    "Mapaso",
    "Monbon",
    "Patag",
    "Salvacion",
    "San Agustin",
    "San Isidro",
    "San Juan",
    "San Julian",
    "San Pedro",
    "Santo Domingo",
    "Tabon-Tabon",
    "Tinampo",
    "Tongdol",
}


class NotificationPreferences(BaseModel):
    email: bool = True
    sms: bool = False
    push: bool = True


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=128)
    email: str = Field(min_length=3, max_length=191)
    password: str = Field(min_length=8, max_length=128)
    age: int | None = Field(default=None, ge=0, le=150)
    sex: str | None = Field(default=None, max_length=16)
    barangay: str = Field(min_length=1, max_length=96)
    phone_number: str | None = Field(default=None, max_length=32)
    language_preference: str | None = Field(default="en", max_length=16)
    notification_preferences: NotificationPreferences | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = re.sub(r"[^0-9+]", "", value.strip())
        if normalized.startswith("+63"):
            normalized = "0" + normalized[3:]
        elif normalized.startswith("63"):
            normalized = "0" + normalized[2:]
        if not re.fullmatch(r"09\d{9}", normalized):
            raise ValueError("Phone number must be a valid Philippine mobile number like 09XXXXXXXXX or +63XXXXXXXXXX.")
        return normalized

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in VALID_SEX_VALUES:
            raise ValueError("Sex must be one of: female, male, other, prefer not to say.")
        return normalized

    @field_validator("language_preference")
    @classmethod
    def validate_language_preference(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in VALID_LANGUAGE_VALUES:
            raise ValueError("Language preference must be one of: en, fil, both.")
        return normalized

    @field_validator("barangay")
    @classmethod
    def validate_barangay(cls, value: str) -> str:
        normalized = value.strip()
        if normalized not in VALID_BARANGAYS:
            raise ValueError("Barangay is not recognized in the HealthGuard registry.")
        return normalized


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
    phone_number: str | None = Field(default=None, max_length=32)
    language_preference: str | None = Field(default=None, max_length=16)
    notification_preferences: NotificationPreferences | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = re.sub(r"[^0-9+]", "", value.strip())
        if normalized.startswith("+63"):
            normalized = "0" + normalized[3:]
        elif normalized.startswith("63"):
            normalized = "0" + normalized[2:]
        if not re.fullmatch(r"09\d{9}", normalized):
            raise ValueError("Phone number must be a valid Philippine mobile number like 09XXXXXXXXX or +63XXXXXXXXXX.")
        return normalized

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in VALID_SEX_VALUES:
            raise ValueError("Sex must be one of: female, male, other, prefer not to say.")
        return normalized

    @field_validator("language_preference")
    @classmethod
    def validate_language_preference(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in VALID_LANGUAGE_VALUES:
            raise ValueError("Language preference must be one of: en, fil, both.")
        return normalized

    @field_validator("barangay")
    @classmethod
    def validate_barangay(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if normalized not in VALID_BARANGAYS:
            raise ValueError("Barangay is not recognized in the HealthGuard registry.")
        return normalized


class ProfileAuditLogOut(BaseModel):
    id: int
    action: str
    details: str
    created_at: datetime


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    age: int | None = None
    sex: str | None = None
    barangay: str | None = None
    phone_number: str | None = None
    language_preference: str | None = None
    notification_preferences: dict | None = None
    created_at: datetime
