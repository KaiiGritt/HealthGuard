"""Transparent, rule-based triage classification.

Given the set of detected symptoms, evaluate declarative clinical rules to produce a
GREEN / YELLOW / RED risk level plus the exact rules that fired (for explainability).
No machine learning — every decision is traceable to a named rule.
"""
from __future__ import annotations

from dataclasses import dataclass

from .lexicon import Match

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
