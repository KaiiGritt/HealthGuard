"""Transparent, rule-based triage classification.

Given the set of detected symptoms, evaluate declarative clinical rules to produce a
GREEN / YELLOW / RED risk level plus the exact rules that fired (for explainability).
No machine learning — every decision is traceable to a named rule.
"""
from __future__ import annotations

from dataclasses import dataclass

from .lexicon import Match


@dataclass(frozen=True)
class MedicationRule:
    """A rule-driven medication recommendation for non-emergency cases."""

    risk_level: str
    symptom_match: tuple[str, ...]
    medication_name: str
    dosage: str
    contraindications: tuple[str, ...]
    side_effects: tuple[str, ...]
    precautions: tuple[str, ...]
    note: str


@dataclass(frozen=True)
class MedicationGuide:
    """Materialized guidance returned to the UI after triage."""

    risk_level: str
    medication_name: str
    dosage: str
    contraindications: tuple[str, ...]
    side_effects: tuple[str, ...]
    precautions: tuple[str, ...]
    note: str


def should_generate_premedication(risk_level: str) -> bool:
    """Generate medication guidance only for non-emergency cases.

    This is the system rule aligned with the class diagram: GREEN and YELLOW cases may
    receive pre-medication guidance, while RED cases must be escalated without medication
    suggestions.
    """
    normalized = (risk_level or "").upper()
    return normalized in {"GREEN", "YELLOW"}


def build_premedication_guide(risk_level: str, detected_symptoms: list[str] | None = None) -> MedicationGuide | None:
    """Generate a symptom-aware pre-medication record for non-red cases."""
    if not should_generate_premedication(risk_level):
        return None

    symptoms = [str(item).strip().lower() for item in (detected_symptoms or []) if str(item).strip()]
    lowered = " ".join(symptoms)

    if any(token in lowered for token in ("fever", "lagnat")):
        rule = MedicationRule(
            risk_level=(risk_level or "GREEN").upper(),
            symptom_match=("fever", "body ache", "weakness"),
            medication_name="Paracetamol (Biogesic / Tempra / Calpol)",
            dosage="Common adult dose is 500 mg every 4 to 6 hours as needed. Do not exceed the label dose in 24 hours.",
            contraindications=(
                "Severe liver disease",
                "Known allergy to paracetamol",
                "Taking another medicine that also contains acetaminophen",
            ),
            side_effects=("Nausea or stomach upset", "Sleepiness", "Rash in some people"),
            precautions=(
                "Use the lowest dose that works for the shortest time needed",
                "Avoid alcohol while taking it",
                "Ask a pharmacist or doctor if you are pregnant, breastfeeding, or have kidney or liver problems",
            ),
            note="Good for simple fever and body aches when used as directed on the label.",
        )
    elif any(token in lowered for token in ("cough", "ubo", "dry cough")):
        rule = MedicationRule(
            risk_level=(risk_level or "GREEN").upper(),
            symptom_match=("cough", "sore throat"),
            medication_name="Cough Relief Support",
            dosage="Take according to the product label, usually for short-term use only, and avoid exceeding the recommended daily dose.",
            contraindications=(
                "Known allergy to any ingredient in the cough medicine",
                "Severe asthma without clinician advice",
                "Concurrent use with other cough suppressants without guidance",
            ),
            side_effects=("Drowsiness", "Dry mouth", "Mild stomach discomfort"),
            precautions=(
                "Do not drive if it causes drowsiness",
                "Drink fluids and rest",
                "Seek medical review if cough lasts more than a week or is accompanied by breathing difficulty",
            ),
            note="This is supportive care for mild cough and throat irritation, but persistent symptoms still need evaluation.",
        )
    else:
        rule = MedicationRule(
            risk_level=(risk_level or "GREEN").upper(),
            symptom_match=("general discomfort", "mild pain"),
            medication_name="Paracetamol (Biogesic / Tempra / Calpol)",
            dosage="Common adult dose is 500 mg every 4 to 6 hours as needed. Use the lowest effective dose and follow the label.",
            contraindications=(
                "Severe liver disease",
                "Known allergy to paracetamol",
                "Taking another medicine that also contains acetaminophen",
            ),
            side_effects=("Nausea or stomach upset", "Sleepiness", "Rash in some people"),
            precautions=(
                "Use the minimum effective dose for the shortest time needed",
                "Avoid alcohol while taking it",
                "Consult your pharmacist or doctor if you are pregnant, breastfeeding, or have kidney or liver problems",
            ),
            note="This is a general supportive option for mild discomfort, low-grade fever, or body aches.",
        )

    return MedicationGuide(
        risk_level=rule.risk_level,
        medication_name=rule.medication_name,
        dosage=rule.dosage,
        contraindications=rule.contraindications,
        side_effects=rule.side_effects,
        precautions=rule.precautions,
        note=rule.note,
    )

# Score thresholds (sum of severity weights of detected symptoms).
RED_SCORE_THRESHOLD = 5
YELLOW_SCORE_THRESHOLD = 2

# Symptoms that trigger RED on their own regardless of score.
CRITICAL_SYMPTOMS = {"difficulty breathing"}


@dataclass(frozen=True)
class Rule:
    name: str
    description: str


@dataclass
class Classification:
    risk_level: str
    score: int
    triggered_rules: list[Rule]
    reason: str
    recommendation: str
    message: str


_MESSAGES = {
    "GREEN": "Your symptoms appear mild. Continue monitoring your condition.",
    "YELLOW": "You may need a consultation.",
    "RED": "Seek immediate medical attention.",
}
_RECOMMENDATIONS = {
    "GREEN": "Rest, stay hydrated, and self-monitor. Seek help if symptoms worsen.",
    "YELLOW": "Contact your Barangay Health Worker or visit the Rural Health Unit (RHU).",
    "RED": "Go to the nearest hospital or call emergency services now. Do not delay.",
}


def classify(matches: list[Match]) -> Classification:
    """Evaluate triage rules over detected symptom matches."""
    triggered: list[Rule] = []
    score = sum(m.severity_weight for m in matches)
    detected_terms = {m.medical_term for m in matches}

    # --- RED rules ---
    critical_hit = detected_terms & CRITICAL_SYMPTOMS
    for symptom in sorted(critical_hit):
        triggered.append(
            Rule(
                name=f"critical:{symptom}",
                description=f"'{symptom}' is a red-flag symptom requiring urgent care.",
            )
        )
    if score >= RED_SCORE_THRESHOLD:
        triggered.append(
            Rule(
                name="high-severity-score",
                description=f"Combined symptom severity ({score}) meets the high-risk threshold "
                f"({RED_SCORE_THRESHOLD}).",
            )
        )

    if critical_hit or score >= RED_SCORE_THRESHOLD:
        level = "RED"
    elif score >= YELLOW_SCORE_THRESHOLD:
        level = "YELLOW"
        triggered.append(
            Rule(
                name="moderate-severity-score",
                description=f"Combined symptom severity ({score}) suggests a consultation "
                f"(threshold {YELLOW_SCORE_THRESHOLD}).",
            )
        )
    elif matches:
        level = "GREEN"
        triggered.append(
            Rule(
                name="mild-symptoms",
                description="Detected symptoms are mild and below the consultation threshold.",
            )
        )
    else:
        level = "GREEN"
        triggered.append(
            Rule(
                name="no-symptoms-detected",
                description="No known symptoms were recognized in the input.",
            )
        )

    reason = _build_reason(matches, triggered)
    return Classification(
        risk_level=level,
        score=score,
        triggered_rules=triggered,
        reason=reason,
        recommendation=_RECOMMENDATIONS[level],
        message=_MESSAGES[level],
    )


def _build_reason(matches: list[Match], rules: list[Rule]) -> str:
    if matches:
        symptoms = ", ".join(sorted({m.medical_term for m in matches}))
        symptom_part = f"Symptoms matched: {symptoms}."
    else:
        symptom_part = "No recognizable symptoms were detected."
    rule_part = " ".join(r.description for r in rules)
    return f"{symptom_part} {rule_part}".strip()
