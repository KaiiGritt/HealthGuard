"""Transparent, rule-based triage classification.

Given the set of detected symptoms, evaluate declarative clinical rules to produce a
GREEN / YELLOW / RED risk level plus the exact rules that fired (for explainability).
No machine learning — every decision is traceable to a named rule.
"""
from __future__ import annotations

from dataclasses import dataclass

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


def _apply_demographic_adjustment(
    score: int, age: int | None = None, sex: str | None = None
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

    normalized_sex = (sex or "").strip().lower()
    if normalized_sex in {"female", "woman", "pregnant"}:
        adjusted_score += 1
        triggered.append(
            Rule(
                name="sex-risk-modifier",
                description="Female/pregnancy context increases caution for symptom review and follow-up when symptoms are present.",
            )
        )

    return adjusted_score, triggered


def _apply_symptom_combo_rules(detected_terms: set[str]) -> list[Rule]:
    """Add explicit combination rules for common high-risk clusters."""
    triggered: list[Rule] = []

    if "difficulty breathing" in detected_terms and ("chest pain" in detected_terms or "chest tightness" in detected_terms):
        triggered.append(
            Rule(
                name="breathing-plus-chest-pain",
                description="Difficulty breathing together with chest pain is a high-risk combination and warrants urgent medical review.",
            )
        )

    if "fever" in detected_terms and "cough" in detected_terms:
        triggered.append(
            Rule(
                name="fever-plus-cough",
                description="Fever plus cough may need review if it is persistent, worsening, or accompanied by other warning signs.",
            )
        )

    if "abdominal pain" in detected_terms and "vomiting" in detected_terms:
        triggered.append(
            Rule(
                name="abdominal-pain-plus-vomiting",
                description="Abdominal pain with vomiting suggests a more concerning pattern that may need support or clinical evaluation.",
            )
        )

    return triggered


def classify(matches: list[Match], age: int | None = None, sex: str | None = None) -> Classification:
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

    triggered.extend(_apply_symptom_combo_rules(detected_terms))

    adjusted_score, demographic_rules = _apply_demographic_adjustment(score, age=age, sex=sex)
    triggered.extend(demographic_rules)

    if adjusted_score >= RED_SCORE_THRESHOLD:
        triggered.append(
            Rule(
                name="high-severity-score",
                description=f"Combined symptom severity ({adjusted_score}) meets the high-risk threshold "
                f"({RED_SCORE_THRESHOLD}).",
            )
        )

    if critical_hit or adjusted_score >= RED_SCORE_THRESHOLD or any(rule.name in {"breathing-plus-chest-pain"} for rule in triggered):
        level = "RED"
    elif adjusted_score >= YELLOW_SCORE_THRESHOLD:
        level = "YELLOW"
        triggered.append(
            Rule(
                name="moderate-severity-score",
                description=f"Combined symptom severity ({adjusted_score}) suggests a consultation "
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
