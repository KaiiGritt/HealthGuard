"""Pending WHO ICD-10 references for reported symptom terms, not diagnoses."""
from __future__ import annotations

from typing import TypedDict

from .seed import SELECTABLE_SYMPTOMS

CODING_SYSTEM = "WHO ICD-10 (2019)"
SOURCE = "WHO ICD-10 Browser, 2019 edition"
SOURCE_URL = "https://icd.who.int/browse10/2019/en"
REVIEW_STATUS = "pending_review"


class Icd10SymptomCode(TypedDict):
    symptom: str
    code: str
    description: str
    coding_system: str
    source: str
    source_url: str
    review_status: str
    reviewer: str | None
    reviewed_at: str | None


class UncodedSymptom(TypedDict):
    symptom: str
    reason: str


_SYMPTOM_CODES: dict[str, tuple[str, str]] = {
    "fever": ("R50.9", "Fever, unspecified"),
    "cough": ("R05", "Cough"),
    "headache": ("R51", "Headache"),
    "abdominal pain": ("R10.4", "Other and unspecified abdominal pain"),
    "vomiting": ("R11", "Nausea and vomiting"),
    "diarrhea": ("R19.7", "Diarrhoea, unspecified"),
    "rash": ("R21", "Rash and other nonspecific skin eruption"),
    "muscle ache / body soreness": ("M79.1", "Myalgia"),
    "chest pain": ("R07.9", "Chest pain, unspecified"),
    "dizziness": ("R42", "Dizziness and giddiness"),
    "generalized weakness": ("R53.1", "Weakness"),
    "difficulty breathing": ("R06.0", "Dyspnoea"),
    "dehydration": ("E86.0", "Dehydration"),
    "fatigue": ("R53", "Malaise and fatigue"),
    "ear pain": ("H92.0", "Otalgia"),
    "blurred vision": ("H53.8", "Other visual disturbances"),
    "eye pain": ("H57.1", "Ocular pain"),
    "nausea": ("R11", "Nausea and vomiting"),
    "constipation": ("K59.0", "Constipation"),
    "heartburn": ("R12", "Heartburn"),
    "abdominal bloating": ("R14", "Flatulence and related conditions"),
    "loss of appetite": ("R63.0", "Anorexia"),
    "jaundice": ("R17", "Unspecified jaundice"),
    "painful urination": ("R30.9", "Painful micturition, unspecified"),
    "frequent urination": ("R35", "Polyuria"),
    "blood in urine": ("R31", "Unspecified haematuria"),
    "joint pain": ("M25.5", "Pain in joint"),
    "back pain": ("M54.9", "Dorsalgia, unspecified"),
    "palpitations": ("R00.2", "Palpitations"),
    "menstrual pain": ("N94.6", "Dysmenorrhoea, unspecified"),
    "vaginal bleeding": ("N93.9", "Abnormal uterine and vaginal bleeding, unspecified"),
    "excessive thirst": ("R63.1", "Polydipsia"),
    "unintentional weight loss": ("R63.4", "Abnormal weight loss"),
    "easy bruising": ("R23.3", "Spontaneous ecchymoses"),
}

_UNCODED_REASONS = {
    "blood in stool": "The wording can describe different findings (including visible red blood, occult blood, or black stool); clarify the finding before selecting a code.",
    "colds / rhinitis": "This combined term may describe a symptom or a condition; a reviewer must determine the intended documented concept.",
    "numbness or tingling": "The code depends on the specific sensation, location, and clinical context; this combined term is too broad.",
}


def codes_for_reported_symptoms(terms: list[str] | None) -> list[Icd10SymptomCode]:
    """Return one pending, source-linked reference per distinctly reported mapped term."""
    codes: list[Icd10SymptomCode] = []
    seen: set[str] = set()
    for raw_term in terms or []:
        symptom = str(raw_term).strip().lower()
        if not symptom or symptom in seen:
            continue
        seen.add(symptom)
        code_entry = _SYMPTOM_CODES.get(symptom)
        if code_entry is None:
            continue
        code, description = code_entry
        codes.append(
            {
                "symptom": symptom,
                "code": code,
                "description": description,
                "coding_system": CODING_SYSTEM,
                "source": SOURCE,
                "source_url": f"{SOURCE_URL}#/{code}",
                "review_status": REVIEW_STATUS,
                "reviewer": None,
                "reviewed_at": None,
            }
        )
    return codes


def uncoded_reported_symptoms(terms: list[str] | None) -> list[UncodedSymptom]:
    """Explain why supported but unmapped symptoms are not assigned a code."""
    uncoded: list[UncodedSymptom] = []
    seen: set[str] = set()
    for raw_term in terms or []:
        symptom = str(raw_term).strip().lower()
        if not symptom or symptom in seen or symptom in _SYMPTOM_CODES:
            continue
        seen.add(symptom)
        reason = _UNCODED_REASONS.get(symptom)
        if reason is None:
            if symptom not in SELECTABLE_SYMPTOMS:
                continue
            reason = "No one-to-one mapping has been prepared for qualified review; no code was inferred."
        uncoded.append({"symptom": symptom, "reason": reason})
    return uncoded


def code_for_reported_symptom(term: str) -> Icd10SymptomCode | None:
    """Return a single pending symptom reference for aggregate community reports."""
    matches = codes_for_reported_symptoms([term])
    return matches[0] if matches else None
