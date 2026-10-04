"""Transparent, rule-based triage classification.

Given the set of detected symptoms, evaluate declarative clinical rules to produce a
GREEN / YELLOW / RED risk level plus the exact rules that fired (for explainability).
No machine learning — every decision is traceable to a named rule.
"""
from __future__ import annotations

from dataclasses import dataclass
import re

from .extractor import is_age_duration, is_negated_prefix
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


RED_FLAG_SYMPTOMS = {
    "difficulty breathing",
    "shortness of breath",
    "chest pain",
    "chest tightness",
    "blood in vomit",
    "green vomit",
    "black stool",
    "active bleeding",
    "neurologic emergency",
    "thunderclap headache",
    "pregnancy warning sign",
    "unable to drink",
    "vomits everything",
    "altered consciousness",
}

NEGATION_PREFIXES = re.compile(
    r"\b(?:no|without|don't have|do not have|not having|not|hindi(?: na)?|wala akong)\s+(?:any\s+)?$"
)

_DURATION_TEXT_PATTERN = re.compile(
    r"(?:started|for|since|lasted|lasting)?\s*(?P<count>\d+(?:\.\d+)?)\s*(?P<unit>hours?|days?|weeks?|months?|oras?|araw|aldaw|linggo|buwan)\b"
)
_DEHYDRATION_PATTERNS = (
    r"\bdehydrat(?:ed|ion)\b",
    r"\bdry mouth\b",
    r"\bdark urine\b",
    r"\b(?:urinating|urination|urine output|peeing)\s+(?:much\s+)?less(?:\s+than\s+usual)?\b",
    r"\bless\s+(?:urination|urine|peeing)\b",
    r"\b(?:no|fewer)\s+wet\s+(?:diapers?|nappies?)\b",
    r"\b(?:walang ihi|kaunti ang ihi|tuyong bibig)\b",
)
_CANNOT_RETAIN_FLUIDS_PATTERNS = (
    r"\b(?:cannot|can't|can not|unable to|not able to)\s+(?:keep|hold)\s+(?:any\s+)?(?:fluids?|water|liquids?)\s+down\b",
    r"\b(?:cannot|can't|unable to)\s+(?:keep|retain)\s+(?:any\s+)?(?:fluids?|water|liquids?)\b",
)


def _is_negated(normalized_text: str, term: str) -> bool:
    """Reject a term when a short negation immediately precedes it."""
    for match in re.finditer(re.escape(term), normalized_text):
        prefix = normalized_text[max(0, match.start() - 24):match.start()]
        if NEGATION_PREFIXES.search(prefix) and is_negated_prefix(prefix):
            return True
    return False


_EMERGENCY_TEXT_PATTERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("blood in vomit", (r"(?:nagsusuka|sumusuka|isinusuka|vomit(?:ing)?)\b.{0,24}\bdugo\b", r"\bblood\b.{0,24}\b(?:vomit|vomiting)\b")),
    ("green vomit", (r"\b(?:yellow[- ]?green|green)\s+(?:vomit(?:ing)?|emesis)\b", r"\b(?:vomit(?:ing)?|emesis)\b.{0,24}\b(?:yellow[- ]?green|green)\b", r"\b(?:dilaw[- ]?)?berde(?:ng)?\s+suka\b", r"\b(?:suka|isinuka|sinuka)\b.{0,24}\bberde(?:ng)?\b")),
    ("black stool", (r"\bitim\s+(?:ang\s+)?dumi\b", r"\bblack\s+stool\b", r"\bmelena\b")),
    ("active bleeding", (r"\bdumudugo\s+(?:ang\s+)?(?:gilagid|ilong)\b", r"\bbleeding\s+gums?\b", r"\bnosebleed\b", r"\bmay\s+pasa\b")),
    ("neurologic emergency", (r"\bseizure\b", r"\bconvuls(?:ion|ions)?\b", r"\bkombulsyon\b", r"\bstiff\s+neck\b", r"\bmatigas\s+(?:ang\s+)?(?:leeg|leyg)\b", r"\b(?:nalilito|confused)\b")),
    ("chest pain", (r"\b(?:sakit|masakit|sumasakit)\s+(?:sa|ang)?\s*dibdib\b", r"\bchest\s+pain\b")),
)


def emergency_terms_from_text(input_text: str) -> list[str]:
    """Return context-specific emergency terms before ordinary extraction."""
    normalized = (input_text or "").lower()
    terms = []
    for canonical, patterns in _EMERGENCY_TEXT_PATTERNS:
        for pattern in patterns:
            match = re.search(pattern, normalized, re.IGNORECASE)
            if match and not is_negated_prefix(normalized[max(0, match.start() - 48):match.start()]):
                terms.append(canonical)
                break
    if re.search(r"\b(?:pinakamasakit|worst\s+headache|thunderclap\s+headache)\b", normalized) or (
        re.search(r"\b(?:biglaan|sudden)\b", normalized)
        and re.search(r"\b(?:ulo|headache|head)\b", normalized)
    ):
        terms.append("thunderclap headache")
    if re.search(r"\bbuntis\b|\bpregnan(?:t|cy)\b", normalized) and re.search(
        r"\b(?:nanlalabo|malabo ang paningin|blurred vision|sakit ng ulo|headache)\b", normalized
    ):
        terms.append("pregnancy warning sign")
    return list(dict.fromkeys(terms))


def _has_unnegated_pattern(input_text: str, patterns: tuple[str, ...]) -> bool:
    normalized = (input_text or "").lower()
    for pattern in patterns:
        for match in re.finditer(pattern, normalized, re.IGNORECASE):
            prefix = normalized[max(0, match.start() - 48):match.start()]
            if not is_negated_prefix(prefix):
                return True
    return False


def _gastrointestinal_review_rules(
    input_text: str,
    detected_terms: set[str],
    age: int | None,
) -> list[Rule]:
    if not detected_terms & {"diarrhea", "vomiting"}:
        return []

    rules: list[Rule] = []
    if _has_unnegated_pattern(input_text, _DEHYDRATION_PATTERNS):
        rules.append(
            Rule(
                name="dehydration-risk-review",
                description="Possible dehydration signs were reported. Contact a health worker promptly; this assessment cannot determine dehydration severity.",
            )
        )
    if _has_unnegated_pattern(input_text, _CANNOT_RETAIN_FLUIDS_PATTERNS):
        rules.append(
            Rule(
                name="cannot-retain-fluids-review",
                description="Inability to keep fluids down was reported. Seek prompt health-worker advice and take small sips only if tolerated.",
            )
        )

    stool_count_patterns = (
        r"\b(?:6|[7-9]|\d{2,})\s+(?:or\s+more\s+)?(?:loose\s+)?stools?\b",
        r"\bsix\s+or\s+more\s+(?:loose\s+)?stools?\b",
    )
    if age is not None and age >= 18 and "diarrhea" in detected_terms:
        normalized = (input_text or "").lower()
        high_stool_count = False
        for pattern in stool_count_patterns:
            match = re.search(pattern, normalized)
            if match:
                prefix = normalized[max(0, match.start() - 24):match.start()]
                if not is_negated_prefix(prefix) and not re.search(r"\b(?:less|fewer)\s+than\s*$", prefix):
                    high_stool_count = True
                    break
        if high_stool_count:
            rules.append(
                Rule(
                    name="high-stool-frequency-review",
                    description="Six or more loose stools in a day were reported. Contact a health worker for clinical advice.",
                )
            )
    return rules

# OTC decision table: symptom patterns → safe recommendation.
# Each entry: (primary_symptom_keywords, optional_symptom_keywords, medicine_name)
# Matching requires at least one primary symptom.
OTC_SYMPTOM_MAP = [
    # Fever / headache → Paracetamol (acetaminophen) or Ibuprofen
    (
        {"fever", "headache", "lagnat"},
        {"body ache", "body pain", "weakness"},
        "Paracetamol",
    ),
    # Cough subtype recommendations are selected from the submitted chip details.
    (
        {"cough", "ubo", "dry cough"},
        {"sore throat", "throat pain", "throat irritation"},
        "Dextromethorphan or Butamirate",
    ),
    (
        {"cough", "ubo", "with phlegm", "phlegm"},
        set(),
        "Carbocisteine, Ambroxol, or Guaifenesin",
    ),
    # Abdominal pain subtypes.
    ({"abdominal pain", "heartburn", "acid", "acid heartburn"}, set(), "Antacids (Aluminum hydroxide and Magnesium hydroxide)"),
    ({"abdominal pain", "gas", "flatulence"}, set(), "Simethicone"),
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
        "Loperamide or Oral Rehydration Solution (ORS)",
    ),
    # Vomiting → oral rehydration solution.
    ({"vomiting", "nausea", "pagsusuka"}, set(), "Oral Rehydration Solution (ORS)"),
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


def build_premedication_guide(
    risk_level: str,
    detected_symptoms: list[str] | None = None,
    input_text: str = "",
    age: int | None = None,
) -> MedicationGuide | None:
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

    if "blood in stool" in symptoms_set:
        if "diarrhea" in symptoms_set:
            return _build_medication_for_match(risk_level, "Oral Rehydration Solution (ORS)", {"diarrhea"})
        return None

    # Type chips are included in input_text by the assessment UI. Prefer the
    # specific validated option before falling back to the broad symptom map.
    context = f"{' '.join(symptoms)} {(input_text or '').lower()}"
    if "diarrhea" in symptoms_set and ((age is not None and age < 12) or "fever" in symptoms_set or "blood" in context):
        return _build_medication_for_match(risk_level, "Oral Rehydration Solution (ORS)", {"diarrhea"})
    if symptoms_set & {"diarrhea", "vomiting"} and (
        _has_unnegated_pattern(context, _DEHYDRATION_PATTERNS)
        or _has_unnegated_pattern(context, _CANNOT_RETAIN_FLUIDS_PATTERNS)
    ):
        return _build_medication_for_match(
            risk_level,
            "Oral Rehydration Solution (ORS)",
            symptoms_set & {"diarrhea", "vomiting"},
        )
    if "cough" in symptoms_set and age is not None and age < 6:
        return None
    if "cough" in symptoms_set and re.search(
        r"\b(?:14|1[5-9]|[2-9]\d+)\s*days?\b|\b(?:2|[3-9]|\d{2,})\s*weeks?\b",
        context,
    ):
        return None
    if "dry cough" in context:
        return _build_medication_for_match(risk_level, "Dextromethorphan or Butamirate", {"dry cough"})
    if "phlegm" in context or "productive" in context or "with phlegm" in context:
        return _build_medication_for_match(risk_level, "Carbocisteine, Ambroxol, or Guaifenesin", {"phlegm"})
    if "heartburn" in context or "acid" in context or "burning pain" in context:
        return _build_medication_for_match(risk_level, "Antacids (Aluminum hydroxide and Magnesium hydroxide)", {"heartburn"})
    if "gas" in context or "flatulence" in context:
        return _build_medication_for_match(risk_level, "Simethicone", {"gas"})

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
        "Paracetamol": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Stomach upset", "Nausea", "Drowsiness"),
            "precautions": ("Ask a pharmacist or doctor which option is appropriate before use.",),
            "note": "Validated options for fever or headache. Use only as directed by a qualified health professional.",
        },
        "Dextromethorphan or Butamirate": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Drowsiness", "Dry mouth", "Stomach upset"),
            "precautions": ("For dry cough only; seek review if breathing becomes difficult or symptoms worsen.",),
            "note": "Validated options for dry cough. A pharmacist or doctor should confirm the suitable product.",
        },
        "Carbocisteine, Ambroxol, or Guaifenesin": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Nausea", "Stomach upset", "Dizziness"),
            "precautions": ("For cough with phlegm; seek review if breathing becomes difficult or symptoms persist.",),
            "note": "Validated options for cough with phlegm. A pharmacist or doctor should confirm the suitable product.",
        },
        "Antacids (Aluminum hydroxide and Magnesium hydroxide)": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Constipation", "Diarrhea", "Stomach discomfort"),
            "precautions": ("For acid or heartburn symptoms; seek review if pain is severe or persistent.",),
            "note": "Validated option for abdominal pain related to acid or heartburn.",
        },
        "Simethicone": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Mild stomach discomfort",),
            "precautions": ("For gas-related discomfort; seek review if pain is severe, persistent, or worsening.",),
            "note": "Validated option for abdominal pain related to gas.",
        },
        "Oral Rehydration Solution (ORS)": {
            "dosage": "Prepare and use only according to the product instructions or a health professional's advice.",
            "contraindications": (),
            "side_effects": ("Nausea", "Temporary bloating"),
            "precautions": ("Seek urgent care for signs of dehydration, persistent vomiting, or worsening diarrhea.",),
            "note": "Validated rehydration support for diarrhea or vomiting; it does not replace medical assessment.",
        },
        "Loperamide or Oral Rehydration Solution (ORS)": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Constipation", "Nausea", "Stomach discomfort"),
            "precautions": ("Ask a pharmacist or doctor before using loperamide, especially for a child or when fever or blood in stool is present.",),
            "note": "Validated options for diarrhea. Oral rehydration is important; seek care if symptoms are severe or worsening.",
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


# Total score thresholds: GREEN 1-2, YELLOW 3-7, RED 8+.
# Emergency text flags and difficulty breathing remain independent overrides.
RED_SCORE_THRESHOLD = 8
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
    score: int,
    age: int | None = None,
    pregnancy_status: str | None = None,
    detected_terms: set[str] | None = None,
) -> tuple[int, list[Rule]]:
    """Increase urgency for higher-risk age contexts without diagnosing conditions."""
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

    if pregnancy_status == "yes" and "fever" in (detected_terms or set()):
        adjusted_score += 1
        triggered.append(
            Rule(
                name="pregnancy-fever-review",
                description="Reported pregnancy with fever requires health-worker review.",
            )
        )

    return adjusted_score, triggered


def _text_rules(input_text: str, detected_terms: set[str], duration_days: float | None = None) -> tuple[list[Rule], bool, int]:
    """Apply wording checks and convert symptom duration into score points."""
    normalized = (input_text or "").lower()
    triggered: list[Rule] = []
    emergency = False

    severity_terms = re.findall(r"\b(severe|worst|unbearable|cannot|can't|unable|sudden)\b", normalized)
    if any(not _is_negated(normalized, term) for term in severity_terms):
        triggered.append(Rule(
            name="severe-or-worsening-language",
            description="The description uses severe or sudden wording and should not be treated as mild.",
        ))
        if detected_terms & {"difficulty breathing"}:
            emergency = True

    worsening_terms = re.findall(r"\b(worsening|getting worse|lumalala|lumubha)\b", normalized)
    if any(not _is_negated(normalized, term) for term in worsening_terms):
        triggered.append(Rule(
            name="worsening-symptoms",
            description="Worsening symptoms require prompt health-worker review.",
        ))

    duration_match = None
    for candidate in _DURATION_TEXT_PATTERN.finditer(normalized):
        if is_age_duration(normalized, candidate):
            continue
        prefix = normalized[max(0, candidate.start() - 36):candidate.start()]
        if re.search(r"\b(?:buntis|pregnant|pregnancy)\b", prefix) and not re.search(
            r"\b(?:fever|lagnat|cough|ubo|pain|sakit|symptom)\b", prefix
        ):
            continue
        duration_match = candidate
        break
    if duration_days is None and duration_match:
        amount = float(duration_match.group("count"))
        unit = duration_match.group("unit")
        duration_days = amount / 24 if unit.startswith("hour") else amount * (7 if unit.startswith("week") else 30 if unit.startswith("month") else 1)
    duration_score = 0
    if duration_days is not None:
        if duration_days <= 1:
            duration_score = 1
        elif duration_days <= 3:
            duration_score = 1 if detected_terms == {"cough"} else 2
            if detected_terms == {"cough"}:
                triggered.append(Rule(
                    name="short-cough-duration-cap",
                    description="An isolated cough lasting three days or less does not reach consultation urgency from duration alone.",
                ))
        elif duration_days <= 7:
            duration_score = 3
        else:
            duration_score = 4
        triggered.append(Rule(
            name="duration-score",
            description=f"Symptoms lasting {duration_days:g} day(s) contribute {duration_score} duration point(s) to the total score.",
        ))
        if "diarrhea" in detected_terms and duration_days >= 14:
            triggered.append(Rule(name="persistent-diarrhea", description="Diarrhea lasting 14 days or longer requires reassessment for persistent diarrhea."))
        if "cough" in detected_terms and duration_days > 30:
            triggered.append(Rule(name="persistent-cough", description="Cough lasting more than 30 days requires referral for further assessment."))
        if "fever" in detected_terms and duration_days > 3:
            triggered.append(Rule(name="persistent-fever", description="Fever lasting more than 3 days needs clinical review."))
        if "fever" in detected_terms and duration_days >= 5:
            triggered.append(Rule(name="prolonged-fever-emergency", description="Fever lasting five days or longer requires urgent assessment."))

    return triggered, emergency, duration_score


def _headache_review_rules(input_text: str, detected_terms: set[str]) -> list[Rule]:
    if "headache" not in detected_terms:
        return []

    normalized = (input_text or "").lower()
    activity = r"(?:cough(?:ing)?|sneez(?:e|ing)|valsalva|strain(?:ing)?|exercis(?:e|ing))"
    headache_before_activity = re.search(
        rf"\b(?:headache|head pain|sakit ng ulo)\b.{{0,48}}\b(?:triggered by|brought on by|caused by|when|while|during)\b.{{0,24}}\b{activity}\b",
        normalized,
    )
    activity_before_headache = re.search(
        rf"\b{activity}\b.{{0,32}}\b(?:triggers|causes|brings on)\b.{{0,24}}\b(?:headache|head pain|sakit ng ulo)\b",
        normalized,
    )
    negated_trigger = re.search(
        r"\b(?:not|never|isn't|is not|doesn't|does not)\s+(?:triggered|brought on|caused|worsened)\s+by\b",
        normalized,
    )
    rules: list[Rule] = []
    if (
        not _is_negated(normalized, "headache")
        and not negated_trigger
        and (headache_before_activity or activity_before_headache)
    ):
        rules.append(
            Rule(
                name="headache-triggered-by-activity-review",
                description="A headache triggered by coughing, straining, sneezing, or exercise was reported. Contact a health worker for clinical evaluation; this guide cannot determine the cause or urgency.",
            )
        )

    cluster_headache = re.search(r"\bcluster(?:-like)?\s+headache\b", normalized)
    first_episode = re.search(
        r"\b(?:first(?:[- ]ever)?|first\s+time|new(?:ly)?\s+(?:onset|started))\b.{0,48}\b(?:bout|attack|episode|headache)\b",
        normalized,
    )
    if cluster_headache and first_episode:
        rules.append(
            Rule(
                name="first-cluster-like-headache-review",
                description="A first or new cluster-like headache was reported. Arrange clinician evaluation; NICE advises discussing further assessment for a first cluster bout. This is not a confirmed diagnosis.",
            )
        )
    return rules


def classify(
    matches: list[Match],
    age: int | None = None,
    age_months: int | None = None,
    sex: str | None = None,
    input_text: str = "",
    duration_days: float | None = None,
    pregnancy_status: str | None = None,
) -> Classification:
    """Evaluate triage rules over detected symptom matches."""
    triggered: list[Rule] = []
    normalized_input = (input_text or "").lower()
    has_duration_input = duration_days is not None or any(
        not is_age_duration(normalized_input, match)
        for match in _DURATION_TEXT_PATTERN.finditer(normalized_input)
    )
    active_matches = [
        m for m in matches
        if not _is_negated(normalized_input, m.matched_text.lower())
    ]
    relative_weekday_onset = bool(
        re.search(
            r"\b(?:mula\s+(?:pa\s+)?noong|since|from)\s+(?:lunes|monday|martes|tuesday|miercoles|wednesday|jueves|thursday|viernes|friday|sabado|saturday|domingo|sunday)\b",
            normalized_input,
        )
    )
    score = sum(m.severity_weight for m in active_matches)
    detected_terms = {m.medical_term for m in active_matches}
    young_infant_fever = age_months is not None and age_months <= 2 and "fever" in detected_terms
    if young_infant_fever:
        triggered.append(
            Rule(
                name="young-infant-fever-referral",
                description="Fever in an infant up to 2 months requires urgent hospital referral.",
            )
        )
    older_adult_fever_weakness = (
        age is not None
        and age > 65
        and {"fever", "generalized weakness"}.issubset(detected_terms)
    )
    blood_in_stool = "blood in stool" in detected_terms
    if blood_in_stool:
        triggered.append(
            Rule(
                name="blood-in-stool-health-worker-review",
                description="Blood in stool was reported; the result requires health-worker review.",
            )
        )
    if older_adult_fever_weakness:
        triggered.append(
            Rule(
                name="older-adult-fever-weakness-override",
                description="Fever with generalized weakness in an adult over 65 requires urgent medical assessment.",
            )
        )

    # --- Weighted symptom plus duration scoring ---
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
    headache_review_rules = _headache_review_rules(input_text, detected_terms)
    gastrointestinal_review_rules = _gastrointestinal_review_rules(input_text, detected_terms, age)
    triggered.extend(headache_review_rules)
    triggered.extend(gastrointestinal_review_rules)
    if relative_weekday_onset:
        text_rules.append(
            Rule(
                name="relative-onset-needs-review",
                description="A weekday onset was reported, but the exact elapsed duration could not be determined.",
            )
        )
    triggered.extend(text_rules)
    adjusted_score, demographic_rules = _apply_demographic_adjustment(
        score + text_score,
        age=age,
        pregnancy_status=pregnancy_status,
        detected_terms=detected_terms,
    )
    triggered.extend(demographic_rules)

    if active_matches:
        symptom_weights = ", ".join(
            f"{match.medical_term} ({match.severity_weight})"
            for match in active_matches
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
            for match in active_matches
            if match.medical_term in detected_terms
        )
        triggered.append(
            Rule(
                name="symptom-combination-score",
                description=f"These symptoms were assessed together: {symptom_weights}. Their combined score contributes to the final urgency level ({adjusted_score}).",
            )
        )

    if adjusted_score >= RED_SCORE_THRESHOLD:
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
                description="Difficulty breathing contributes six points, placing it in the RED range even when reported alone.",
            )
        )
    if len(detected_terms) >= 4:
        triggered.append(
            Rule(
                name="four-symptom-override",
                description="Four or more reported symptoms require immediate medical review regardless of their combined score.",
            )
        )

    score_red = adjusted_score >= RED_SCORE_THRESHOLD
    if other_red_flag_hit or breathing_hit or score_red or text_emergency or older_adult_fever_weakness or young_infant_fever or ("fever" in detected_terms and duration_days is not None and duration_days >= 5) or (age == 0 and "fever" in detected_terms):
        level = "RED"
    elif blood_in_stool:
        level = "YELLOW"
    elif headache_review_rules or gastrointestinal_review_rules:
        level = "YELLOW"
    elif relative_weekday_onset and detected_terms:
        level = "YELLOW"
    elif pregnancy_status == "yes" and "fever" in detected_terms:
        level = "YELLOW"
    elif not has_duration_input and len(detected_terms) == 1:
        level = "GREEN"
        triggered.append(
            Rule(
                name="duration-not-provided",
                description="No symptom duration was provided, so the assessment used the symptom-only GREEN baseline. Select when symptoms started for duration-based scoring.",
            )
        )
    else:
        score_level = "YELLOW" if adjusted_score >= YELLOW_SCORE_THRESHOLD else "GREEN"
        if not detected_terms:
            level = "YELLOW"
        else:
            level = score_level

    if level == "YELLOW" and adjusted_score >= YELLOW_SCORE_THRESHOLD:
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
    reason = _build_reason(active_matches, triggered, adjusted_score, level)
    return Classification(
        risk_level=level,
        score=adjusted_score,
        triggered_rules=triggered,
        reason=reason,
        recommendation=_RECOMMENDATIONS[level],
        message=_MESSAGES[level],
    )


def _build_reason(matches: list[Match], rules: list[Rule], score: int, risk_level: str) -> str:
    """Build a concise clinical explanation without exposing engine internals."""
    if not matches:
        return "No recognizable symptoms were detected. A health worker should review the concern."

    labels = {
        "fever": "fever",
        "headache": "headache",
        "cough": "cough",
        "vomiting": "vomiting",
        "diarrhea": "diarrhea",
        "abdominal pain": "abdominal pain",
        "difficulty breathing": "difficulty breathing",
    }
    symptoms = ", ".join(labels.get(term, term) for term in sorted({m.medical_term for m in matches}))
    duration_rule = next((rule for rule in rules if rule.name == "duration-score"), None)
    duration_text = ""
    if duration_rule:
        duration_match = re.search(r"lasting ([\d.]+) day\(s\) contribute (\d+) duration point", duration_rule.description)
        if duration_match:
            duration_text = f" The reported duration of {duration_match.group(1)} days added {duration_match.group(2)} point(s)."

    level_text = {
        "GREEN": "This is currently in the GREEN range, so monitor symptoms and follow the care advice.",
        "YELLOW": "This is in the YELLOW range, so arrange a consultation with a health worker or visit the RHU.",
        "RED": "This is in the RED range, so seek urgent medical attention now.",
    }[risk_level]
    return f"The assessment identified {symptoms}.{duration_text} The combined clinical score is {score}. {level_text}"
