"""Transparent, rule-based triage classification.

Given the set of detected symptoms, evaluate declarative clinical rules to produce a
GREEN / YELLOW / RED risk level plus the exact rules that fired (for explainability).
No machine learning — every decision is traceable to a named rule.
"""
from __future__ import annotations

from dataclasses import dataclass
import re

from .lexicon import LexiconEntry, Match, match_selected, match_text


def _supported_lexicon_entries() -> list[LexiconEntry]:
    """Return the canonical symptom lexicon used for validation and symptom matching."""
    from ..seed import LEXICON_SEED

    entries: list[LexiconEntry] = []
    for item in LEXICON_SEED:
        entries.append(
            LexiconEntry(
                local_term=str(item.get("local_term", "")).strip(),
                language=str(item.get("language", "en")).strip() or "en",
                medical_term=str(item.get("medical_term", "")).strip(),
                severity_weight=int(item.get("severity_weight", 1) or 1),
                category=str(item.get("category", "general")).strip() or "general",
            )
        )
    return entries


def has_supported_symptom_input(input_text: str, selected_symptoms: list[str] | None = None) -> bool:
    """Allow an assessment only when at least one recognized symptom is present.

    This prevents random free-text like "I don't have money" from generating a triage result.
    """
    entries = _supported_lexicon_entries()
    cleaned_selected = [str(item).strip() for item in (selected_symptoms or []) if str(item).strip()]
    if not cleaned_selected and not str(input_text or "").strip():
        return False

    return bool(match_text(str(input_text or ""), entries) or match_selected(cleaned_selected, entries))


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


# RED-FLAG symptoms that require escalation to medical evaluation, NOT OTC-only advice.
# Aligned with Philippine FDA and WHO guidance on when self-medication is inappropriate.
RED_FLAG_SYMPTOMS = {
    "difficulty breathing",
    "shortness of breath",
    "chest pain",
    "chest tightness",
    "fainting",
    "loss of consciousness",
    "severe dehydration",
    "bloody stool",
    "blood in vomit",
    "severe abdominal pain",
    "sudden weakness",
    "confusion",
    "severe rash",
    "facial swelling",
    "wheezing",
    "anaphylaxis",
    "severe allergic reaction",
}

# OTC decision table: symptom patterns → safe recommendation.
# Each entry: (primary_symptom_keywords, optional_symptom_keywords, medicine_name)
# Matching requires at least one primary symptom.
OTC_SYMPTOM_MAP = [
    # Fever / body ache → Paracetamol (acetaminophen)
    (
        {"fever", "lagnat"},
        {"body ache", "body pain", "weakness"},
        "Paracetamol (Biogesic / Tempra / Calpol)",
    ),
    # Cough / sore throat → Cough Relief Support (avoid in asthma without guidance)
    (
        {"cough", "ubo", "dry cough"},
        {"sore throat", "throat pain", "throat irritation"},
        "Cough Relief Support",
    ),
    # Nasal congestion + headache → Decongestant + Paracetamol
    (
        {"nasal congestion", "runny nose", "stuffy nose", "sneezing"},
        set(),
        "Decongestant with mild pain relief",
    ),
    # Diarrhea + mild cramps → Oral rehydration + anti-motility
    (
        {"diarrhea", "loose stool"},
        {"stomach cramps", "abdominal discomfort"},
        "Oral Rehydration Salts + Symptom Relief",
    ),
    # Rash + itch → Antihistamine or topical soothing agent
    (
        {"rash", "itching", "skin itch", "allergic reaction"},
        set(),
        "Antihistamine or Topical Soothing Agent",
    ),
    # Muscle pain / joint pain → Paracetamol or NSAIDs (not just fatigue alone)
    (
        {"muscle pain", "body pain", "joint pain"},
        {"weakness", "soreness"},
        "Paracetamol or NSAID (if no kidney/GI disease)",
    ),
]


def should_generate_premedication(risk_level: str) -> bool:
    """Generate medication guidance only for non-emergency cases.

    This is the system rule aligned with the class diagram: GREEN and YELLOW cases may
    receive pre-medication guidance, while RED cases must be escalated without medication
    suggestions.
    """
    normalized = (risk_level or "").upper()
    return normalized in {"GREEN", "YELLOW"}


def has_red_flag_symptom(detected_symptoms: list[str]) -> bool:
    """Check if any detected symptom is a red flag requiring escalation."""
    symptoms_lower = {str(s).strip().lower() for s in (detected_symptoms or [])}
    return bool(symptoms_lower & RED_FLAG_SYMPTOMS)


def build_premedication_guide(risk_level: str, detected_symptoms: list[str] | None = None) -> MedicationGuide | None:
    """Generate a symptom-aware pre-medication record for non-red cases.
    
    Returns None if:
    - risk_level is RED (escalation only)
    - red-flag symptoms are present (escalation only)
    - symptoms don't match any safe OTC pattern (general support only)
    """
    if not should_generate_premedication(risk_level):
        return None

    symptoms = [str(item).strip().lower() for item in (detected_symptoms or []) if str(item).strip()]
    
    # CRITICAL: Block OTC recommendation if red-flag symptoms are present
    if has_red_flag_symptom(symptoms):
        return None

    symptoms_set = set(symptoms)

    # Try to match against the OTC symptom decision table
    # Matching requires at least one primary symptom to be present
    for primary_keywords, optional_keywords, medicine_name in OTC_SYMPTOM_MAP:
        if symptoms_set & primary_keywords:  # At least one primary symptom matched
            matched_keywords = symptoms_set & (primary_keywords | optional_keywords)
            return _build_medication_for_match(risk_level, medicine_name, matched_keywords)

    # No specific match: return general supportive guidance (not medication-focused)
    rule = MedicationRule(
        risk_level=(risk_level or "GREEN").upper(),
        symptom_match=("general discomfort", "mild pain", "fatigue"),
        medication_name="General Symptom Support",
        dosage="Follow the product label for the specific medicine you choose, and limit use to the lowest effective dose for the shortest time needed.",
        contraindications=(
            "Known allergy to any ingredient in the medicine",
            "Use with another medicine that has the same active ingredient without professional advice",
            "Severe underlying medical conditions that require clinician review",
        ),
        side_effects=("Drowsiness", "Dry mouth", "Mild stomach discomfort"),
        precautions=(
            "Rest and stay hydrated while monitoring symptoms",
            "Avoid driving if it causes drowsiness",
            "Seek assessment if symptoms persist, worsen, or are accompanied by breathing difficulty or severe pain",
        ),
        note="This is a broad supportive recommendation for non-specific symptoms and should be paired with clinical review if the condition remains unclear.",
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


def _build_medication_for_match(
    risk_level: str, medicine_name: str, matched_keywords: set
) -> MedicationGuide:
    """Build guidance for a matched OTC pattern."""
    
    # Specific guidance for each matched medicine type
    medicines_data = {
        "Paracetamol (Biogesic / Tempra / Calpol)": {
            "dosage": "Common adult dose is 500 mg every 4 to 6 hours as needed. Do not exceed the label dose in 24 hours.",
            "contraindications": (
                "Severe liver disease",
                "Known allergy to paracetamol",
                "Taking another medicine that also contains acetaminophen",
            ),
            "side_effects": ("Nausea or stomach upset", "Sleepiness", "Rash in some people"),
            "precautions": (
                "Use the lowest dose that works for the shortest time needed",
                "Avoid alcohol while taking it",
                "Ask a pharmacist or doctor if you are pregnant, breastfeeding, or have kidney or liver problems",
            ),
            "note": "Appropriate for fever and body aches. Do not exceed 24-hour limit.",
        },
        "Cough Relief Support": {
            "dosage": "Take according to the product label, usually for short-term use only, and avoid exceeding the recommended daily dose.",
            "contraindications": (
                "Known allergy to any ingredient in the cough medicine",
                "Severe asthma without clinician advice",
                "Concurrent use with other cough suppressants without guidance",
            ),
            "side_effects": ("Drowsiness", "Dry mouth", "Mild stomach discomfort"),
            "precautions": (
                "Do not drive if it causes drowsiness",
                "Drink fluids and rest",
                "Seek medical review if cough lasts more than a week or is accompanied by breathing difficulty",
            ),
            "note": "Use for short-term symptom relief only; persistent cough requires evaluation.",
        },
        "Decongestant with mild pain relief": {
            "dosage": "Follow the product label for dosing; use for 3-7 days maximum.",
            "contraindications": (
                "High blood pressure or heart disease",
                "Taking stimulant medications",
                "Thyroid disorder",
            ),
            "side_effects": ("Mild nervousness", "Sleeplessness", "Slight increase in heart rate"),
            "precautions": (
                "Not for use if you have hypertension without medical advice",
                "Do not combine with other decongestants",
                "Use for the shortest time possible",
            ),
            "note": "For temporary nasal congestion relief; does not treat underlying cause.",
        },
        "Oral Rehydration Salts + Symptom Relief": {
            "dosage": "Oral rehydration salts: mix according to package. Antidiarrheal: follow label for age/weight.",
            "contraindications": (
                "High fever with diarrhea (seek evaluation)",
                "Bloody stool",
                "Severe dehydration or signs of shock",
            ),
            "side_effects": ("Mild nausea", "Slight salty taste"),
            "precautions": (
                "Hydration is the most important treatment",
                "Stop antidiarrheal if bloody stool appears",
                "Seek help if symptoms persist beyond 2 days or dehydration worsens",
            ),
            "note": "Rehydration is key; limit antidiarrheal use and seek help if not improving.",
        },
        "Antihistamine or Topical Soothing Agent": {
            "dosage": "Antihistamine: follow label for age. Topical: apply to affected area 3-4 times daily.",
            "contraindications": (
                "Known allergy to antihistamine",
                "Severe or widespread rash",
                "Facial swelling or wheezing",
            ),
            "side_effects": ("Drowsiness (with some antihistamines)", "Dry mouth", "Mild local irritation"),
            "precautions": (
                "Do not drive if drowsy",
                "Severe rash, facial swelling, or wheezing requires urgent care",
                "If rash spreads or worsens, stop and seek help",
            ),
            "note": "For mild allergic or itchy skin symptoms; severe rash is not appropriate for OTC.",
        },
        "Paracetamol or NSAID (if no kidney/GI disease)": {
            "dosage": "Paracetamol: 500 mg every 4-6 hours. NSAID (ibuprofen): 200-400 mg every 6-8 hours with food.",
            "contraindications": (
                "Known kidney disease",
                "History of stomach ulcers or GI bleeding",
                "Allergy to NSAID or paracetamol",
                "Taking blood thinners",
            ),
            "side_effects": ("Nausea", "Stomach discomfort", "Dizziness"),
            "precautions": (
                "Take with food if using NSAID",
                "Do not exceed recommended daily doses",
                "Ask pharmacist before combining with other pain relievers",
                "Stop if stomach pain or black stool occurs",
            ),
            "note": "Choice depends on personal medical history; ask pharmacist when uncertain.",
        },
    }

    med_data = medicines_data.get(medicine_name, {})
    
    rule = MedicationRule(
        risk_level=(risk_level or "GREEN").upper(),
        symptom_match=tuple(matched_keywords),
        medication_name=medicine_name,
        dosage=med_data.get("dosage", "Follow product label."),
        contraindications=med_data.get("contraindications", ()),
        side_effects=med_data.get("side_effects", ()),
        precautions=med_data.get("precautions", ()),
        note=med_data.get("note", ""),
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


# Draft score thresholds. These values are intentionally easy to revise after MHO review.
RED_SCORE_THRESHOLD = 6
YELLOW_SCORE_THRESHOLD = 3

# Difficulty breathing has a special minimum and combination override.
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


def _apply_demographic_adjustment(
    score: int, age: int | None = None, pregnant: bool = False
) -> tuple[int, list[Rule]]:
    """Increase urgency for higher-risk age/sex contexts without diagnosing conditions."""
    adjusted_score = score
    triggered: list[Rule] = []

    if age is not None and (age < 5 or age > 65):
        adjusted_score += 1
        triggered.append(
            Rule(
                name="age-risk-modifier",
                description="Age is outside the typical low-risk adult range, which increases urgency for symptom review.",
            )
        )

    if pregnant:
        adjusted_score += 1
        triggered.append(
            Rule(
                name="pregnancy-risk-modifier",
                description="Pregnancy or recent postpartum context increases caution for symptom review and follow-up.",
            )
        )

    return adjusted_score, triggered


def _text_rules(input_text: str, detected_terms: set[str], duration_days: float | None = None) -> tuple[list[Rule], bool, int]:
    """Apply duration and severity wording rules to the submitted description."""
    normalized = (input_text or "").lower()
    triggered: list[Rule] = []
    emergency = False

    if re.search(r"\b(severe|worst|unbearable|cannot|can't|unable|sudden)\b", normalized):
        triggered.append(Rule(
            name="severe-or-worsening-language",
            description="The description uses severe or sudden wording and should not be treated as mild.",
        ))
        if detected_terms & {"chest pain", "fainting", "confusion", "difficulty breathing", "severe abdominal pain"}:
            emergency = True

    if re.search(r"\b(worsening|getting worse|lumalala|lumubha)\b", normalized):
        triggered.append(Rule(
            name="worsening-symptoms",
            description="Worsening symptoms require prompt health-worker review.",
        ))

    duration_match = re.search(r"(?:started|for|since|lasted|lasting)?\s*(\d+(?:\.\d+)?)\s*(hour|hours|day|days|week|weeks|month|months)\b", normalized)
    if duration_days is None and duration_match:
        amount = float(duration_match.group(1))
        unit = duration_match.group(2)
        duration_days = amount / 24 if unit.startswith("hour") else amount * (7 if unit.startswith("week") else 30 if unit.startswith("month") else 1)
    if duration_days is not None:
        if "diarrhea" in detected_terms and duration_days >= 14:
            triggered.append(Rule(name="persistent-diarrhea", description="Diarrhea lasting 14 days or longer requires reassessment for persistent diarrhea."))
        if "cough" in detected_terms and duration_days > 30:
            triggered.append(Rule(name="persistent-cough", description="Cough lasting more than 30 days requires referral for further assessment."))
        if "fever" in detected_terms and duration_days > 3:
            triggered.append(Rule(name="persistent-fever", description="Fever lasting more than 3 days needs clinical review."))

    return triggered, emergency, 2 if triggered else 0


def _apply_vital_sign_rules(
    temperature_c: float | None,
    oxygen_saturation: float | None,
    heart_rate: int | None,
    systolic_bp: int | None,
) -> tuple[list[Rule], bool, int]:
    triggered: list[Rule] = []
    emergency = False
    if oxygen_saturation is not None and oxygen_saturation < 90:
        triggered.append(Rule(name="critical-oxygen-saturation", description="Oxygen saturation below 90% requires immediate medical attention."))
        emergency = True
    elif oxygen_saturation is not None and oxygen_saturation < 94:
        triggered.append(Rule(name="low-oxygen-saturation", description="Oxygen saturation below 94% requires prompt clinical review."))
    if temperature_c is not None and temperature_c >= 40:
        triggered.append(Rule(name="critical-temperature", description="Temperature of 40°C or higher requires immediate medical attention."))
        emergency = True
    elif temperature_c is not None and temperature_c >= 39:
        triggered.append(Rule(name="high-temperature", description="Temperature of 39°C or higher requires prompt clinical review."))
    if heart_rate is not None and (heart_rate > 130 or heart_rate < 40):
        triggered.append(Rule(name="critical-heart-rate", description="A very fast or slow heart rate requires immediate medical attention."))
        emergency = True
    if systolic_bp is not None and systolic_bp < 90:
        triggered.append(Rule(name="low-blood-pressure", description="Systolic blood pressure below 90 mmHg requires immediate medical attention."))
        emergency = True
    return triggered, emergency, 2 if triggered and not emergency else 0


def classify(
    matches: list[Match],
    age: int | None = None,
    sex: str | None = None,
    input_text: str = "",
    duration_days: float | None = None,
    pregnant: bool = False,
    temperature_c: float | None = None,
    oxygen_saturation: float | None = None,
    heart_rate: int | None = None,
    systolic_bp: int | None = None,
) -> Classification:
    """Evaluate triage rules over detected symptom matches."""
    triggered: list[Rule] = []
    score = sum(m.severity_weight for m in matches)
    detected_terms = {m.medical_term for m in matches}

    # --- Generic scoring rules ---
    critical_hit = detected_terms & RED_FLAG_SYMPTOMS
    breathing_hit = detected_terms & CRITICAL_SYMPTOMS
    other_red_flag_hit = critical_hit - CRITICAL_SYMPTOMS
    for symptom in sorted(critical_hit):
        triggered.append(
            Rule(
                name=f"critical:{symptom}",
                description=f"'{symptom}' is a red-flag symptom requiring urgent care.",
            )
        )

    text_rules, text_emergency, text_score = _text_rules(input_text, detected_terms, duration_days=duration_days)
    triggered.extend(text_rules)
    vital_rules, vital_emergency, vital_score = _apply_vital_sign_rules(temperature_c, oxygen_saturation, heart_rate, systolic_bp)
    triggered.extend(vital_rules)

    adjusted_score, demographic_rules = _apply_demographic_adjustment(
        score + text_score + vital_score,
        age=age,
        pregnant=pregnant,
    )
    triggered.extend(demographic_rules)

    if matches:
        symptom_weights = ", ".join(
            f"{match.medical_term} ({match.severity_weight})"
            for match in matches
        )
        triggered.append(
            Rule(
                name="weighted-symptom-score",
                description=f"Recognized symptom weights: {symptom_weights}. The base symptom score is {score}; context adjustments produce a final score of {adjusted_score}.",
            )
        )

    if len(detected_terms) >= 2:
        symptom_weights = ", ".join(
            f"{match.medical_term} ({match.severity_weight})"
            for match in matches
            if match.medical_term in detected_terms
        )
        triggered.append(
            Rule(
                name="symptom-combination-score",
                description=f"These symptoms were assessed together: {symptom_weights}. Their combined score contributes to the final urgency level ({adjusted_score}).",
            )
        )

    if adjusted_score >= RED_SCORE_THRESHOLD and not (breathing_hit and len(detected_terms) == 1):
        triggered.append(
            Rule(
                name="high-severity-score",
                description=f"Combined symptom severity ({adjusted_score}) meets the high-risk threshold "
                f"({RED_SCORE_THRESHOLD}).",
            )
        )

    if not detected_terms:
        triggered.append(
            Rule(
                name="unclear-symptoms-floor",
                description="No supported symptom was recognized, so the result requires health-worker review instead of being treated as GREEN.",
            )
        )
    if breathing_hit:
        triggered.append(
            Rule(
                name="difficulty-breathing-override",
                description="Difficulty breathing is an urgent symptom: alone it requires at least a consultation, and with any other symptom it requires immediate care.",
            )
        )
    if len(detected_terms) >= 4:
        triggered.append(
            Rule(
                name="four-symptom-override",
                description="Four or more reported symptoms require immediate medical review regardless of their combined score.",
            )
        )

    score_red = adjusted_score >= RED_SCORE_THRESHOLD and not (breathing_hit and len(detected_terms) == 1)
    if other_red_flag_hit or score_red or text_emergency or vital_emergency or len(detected_terms) >= 4 or (breathing_hit and len(detected_terms) >= 2):
        level = "RED"
    else:
        score_level = "YELLOW" if adjusted_score >= YELLOW_SCORE_THRESHOLD else "GREEN"
        if not detected_terms:
            level = "YELLOW"
        elif len(detected_terms) >= 3:
            level = "RED" if score_level == "YELLOW" else "YELLOW"
            triggered.append(
                Rule(
                    name="symptom-count-escalation",
                    description="Three or more reported symptoms increase the score-based urgency by one level.",
                )
            )
        else:
            level = score_level

    if level == "YELLOW" and not any(rule.name == "symptom-count-escalation" for rule in triggered):
        level = "YELLOW"
        triggered.append(
            Rule(
                name="moderate-severity-score",
                description=f"Combined symptom severity ({adjusted_score}) suggests a consultation "
                f"(threshold {YELLOW_SCORE_THRESHOLD}).",
            )
        )
    elif level == "GREEN":
        level = "GREEN"
        triggered.append(
            Rule(
                name="mild-severity-score",
                description=f"Combined symptom severity ({adjusted_score}) is below the consultation threshold ({YELLOW_SCORE_THRESHOLD}).",
            )
        )
    reason = _build_reason(matches, triggered)
    return Classification(
        risk_level=level,
        score=adjusted_score,
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
