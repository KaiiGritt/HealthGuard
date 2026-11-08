"""Transparent, rule-based triage classification.

Given the set of detected symptoms, evaluate declarative clinical rules to produce a
GREEN / YELLOW / RED risk level plus the exact rules that fired (for explainability).
No machine learning — every decision is traceable to a named rule.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
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
    "coffee-ground vomit",
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
_RASH_SYSTEMIC_PATTERNS = (
    r"\b(?:fever|headache|eye pain|pain behind (?:the )?eyes|body aches?|muscle aches?|myalgia|dengue)\b",
    r"\b(?:lagnat|sakit sa mata|pananakit ng katawan)\b",
)
_RASH_URGENT_PATTERNS = (
    r"\b(?:swelling|swollen)\s+(?:of\s+)?(?:the\s+)?(?:lips?|tongue|throat)\b",
    r"\b(?:widespread\s+)?blister(?:ing|s)?\b",
    r"\bskin peeling\b",
    r"\b(?:painful\s+)?rash.{0,40}\b(?:eyes|mouth|genitals)\b",
    r"\b(?:purple|red)\s+spots?.{0,35}\b(?:do not|don't|does not|doesn't)\s+fade\b",
    r"\b(?:rash.{0,40})?(?:fever.{0,30}confusion|confusion.{0,30}fever)\b",
    r"\b(?:rapidly spreading|spreading quickly).{0,50}\b(?:redness|warmth|swelling|pus)\b",
)
_RASH_CARE_PRECAUTIONS = (
    "Identify the possible cause before choosing a treatment; an unexplained rash is not automatically an allergy.",
    "Do not apply topical corticosteroids to a suspected fungal infection without medical advice; they can mask or worsen it.",
    "Avoid scratching, rubbing, excessive heat, multiple creams, or household remedies on an unexplained rash.",
    "Wash gently with mild soap and water, and keep the affected area clean and dry.",
    "Stop using any new product that may have triggered the rash; avoid suspected irritants and allergens.",
    "Use a cool, wet compress for 10–15 minutes and fragrance-free moisturizer for dry or irritated skin.",
    "Wear loose, breathable clothing.",
    "Do not share towels, clothing, or personal items if a contagious skin infection is possible.",
    "Ask a healthcare professional before using medicated creams on infants, young children, during pregnancy, or over large areas of skin.",
    "Antihistamines are not a substitute for emergency treatment of a severe allergic reaction.",
    "Seek emergency care for rash with difficulty breathing or swelling of the lips, tongue, or throat.",
    "Seek urgent care for widespread blistering or peeling, or a painful rash involving the eyes, mouth, or genitals.",
    "Seek urgent care for purple or red spots that do not fade when pressed, rash with fever and confusion, or rapidly spreading redness, warmth, swelling, or pus.",
    "In the Philippines, rash with fever, headache, eye pain, or body aches needs medical assessment for possible dengue.",
    "With possible dengue, seek urgent assessment for severe abdominal pain, persistent vomiting, nose or gum bleeding, blood in vomit or stool, or unusual tiredness or restlessness, even if fever has gone away.",
)


def _is_negated(normalized_text: str, term: str) -> bool:
    """Reject a term when a short negation immediately precedes it."""
    for match in re.finditer(re.escape(term), normalized_text):
        prefix = normalized_text[max(0, match.start() - 24):match.start()]
        if NEGATION_PREFIXES.search(prefix) and is_negated_prefix(prefix):
            return True
    return False


_EMERGENCY_TEXT_PATTERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("blood in vomit", (r"(?:nagsusuka|sumusuka|isinusuka|vomit(?:ing)?)\b.{0,24}\bdugo\b", r"\bblood\b.{0,24}\b(?:vomit|vomiting)\b", r"\b(?:hematemesis|bloody vomiting|bloody vomit)\b")),
    ("green vomit", (r"\b(?:yellow[- ]?green|green)\s+(?:vomit(?:ing)?|emesis)\b", r"\b(?:vomit(?:ing)?|emesis)\b.{0,24}\b(?:yellow[- ]?green|green)\b", r"\b(?:dilaw[- ]?)?berde(?:ng)?\s+suka\b", r"\b(?:suka|isinuka|sinuka)\b.{0,24}\bberde(?:ng)?\b", r"\bbilious vomiting\b")),
    ("coffee-ground vomit", (r"\bcoffee[- ]ground\s+(?:vomit(?:ing)?|emesis)\b", r"\b(?:vomit(?:ing)?|emesis)\b.{0,24}\bcoffee[- ]ground\b")),
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
    # Abdominal pain subtypes.
    ({"abdominal pain", "heartburn", "acid", "acid heartburn"}, set(), "Antacids (Aluminum hydroxide and Magnesium hydroxide)"),
    ({"abdominal pain", "gas", "flatulence"}, set(), "Simethicone"),
    # Body aches → paracetamol only; do not recommend NSAIDs when dengue is possible.
    (
        {"muscle pain", "body pain", "joint pain", "muscle ache / body soreness", "body aches", "body ache"},
        set(),
        "Paracetamol",
    ),
    # Diarrhea + mild cramps → Oral rehydration + anti-motility
    (
        {"diarrhea", "loose stool"},
        {"stomach cramps", "abdominal discomfort"},
        "Loperamide or Oral Rehydration Solution (ORS)",
    ),
    # Vomiting → oral rehydration solution.
    ({"vomiting", "nausea", "pagsusuka"}, set(), "Oral Rehydration Solution (ORS)"),
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

    # Type chips are included in input_text by the assessment UI.
    context = f"{' '.join(symptoms)} {(input_text or '').lower()}"
    fever_pattern_labels = (
        ("continuous fever", "Continuous fever"),
        ("intermittent fever", "Intermittent fever"),
        ("remittent fever", "Remittent fever"),
        ("relapsing fever", "Relapsing fever"),
        ("recurrent fever", "Recurrent fever"),
    )
    selected_fever_patterns = [
        label
        for pattern, label in fever_pattern_labels
        if re.search(rf"\b{re.escape(pattern)}\b", context)
    ]
    diarrhea_classification = re.search(
        r"\b(chronic diarrhea|persistent diarrhea|acute diarrhea)\b",
        context,
    )
    vomiting_classification = re.search(
        r"\b(chronic vomiting|persistent vomiting|acute vomiting)\b",
        context,
    )
    motion_sickness_context = _has_unnegated_pattern(
        context,
        (
            r"\bmotion sickness\b",
            r"\btravel[- ]related nausea\b",
            r"\btravel sickness\b",
            r"\bmotion[- ]related (?:nausea|vomiting)\b",
            r"\bvertigo[- ]associated nausea\b",
            r"\bdizziness associated with motion sickness\b",
        ),
    )
    if "colds / rhinitis" in symptoms_set:
        return _build_medication_for_match(
            risk_level,
            "Cold symptom self-care",
            {"colds / rhinitis"},
        )
    itch_patterns = (
        r"\bitch(?:y|ing|iness)?\b",
        r"\bpruritus\b",
        r"\b(?:makati|nangangati|kati)\b",
    )
    rash_systemic_symptoms = {
        "fever",
        "headache",
        "muscle ache / body soreness",
    }
    has_rash_systemic_symptoms = bool(symptoms_set & rash_systemic_symptoms) or _has_unnegated_pattern(
        context,
        _RASH_SYSTEMIC_PATTERNS,
    )
    if "rash" in symptoms_set and _has_unnegated_pattern(context, _RASH_URGENT_PATTERNS):
        return _build_medication_for_match(
            risk_level,
            "Rash warning signs — urgent assessment",
            {"rash"},
        )
    if "rash" in symptoms_set and has_rash_systemic_symptoms:
        return _build_medication_for_match(
            risk_level,
            "Rash with systemic symptoms — medical review",
            {"rash"},
        )
    if "rash" in symptoms_set and _has_unnegated_pattern(context, itch_patterns):
        return _build_medication_for_match(
            risk_level,
            "Pharmacist advice for itchy skin",
            {"rash", "itching"},
        )
    if "rash" in symptoms_set:
        return _build_medication_for_match(
            risk_level,
            "Non-drug skin care",
            {"rash"},
        )
    if "diarrhea" in symptoms_set and diarrhea_classification:
        classification = diarrhea_classification.group(1)
        if classification in {"persistent diarrhea", "chronic diarrhea"}:
            return _build_medication_for_match(
                risk_level,
                "Diarrhea needs clinical review",
                {"diarrhea"},
            )
    if "vomiting" in symptoms_set and vomiting_classification:
        if vomiting_classification.group(1) in {"persistent vomiting", "chronic vomiting"}:
            return _build_medication_for_match(
                risk_level,
                "Vomiting needs clinical review",
                {"vomiting"},
            )
    if (
        "vomiting" in symptoms_set
        and "diarrhea" not in symptoms_set
        and motion_sickness_context
        and age is not None
        and age >= 18
        and not _has_unnegated_pattern(context, _DEHYDRATION_PATTERNS)
        and not _has_unnegated_pattern(context, _CANNOT_RETAIN_FLUIDS_PATTERNS)
    ):
        return _build_medication_for_match(
            risk_level,
            "Motion sickness vomiting support",
            {"vomiting"},
        )
    if "vomiting" in symptoms_set and vomiting_classification:
        return _build_medication_for_match(
            risk_level,
            "Oral Rehydration Solution (ORS)",
            {"vomiting"},
        )
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
    if "diarrhea" in symptoms_set:
        return _build_medication_for_match(
            risk_level,
            "Diarrhea supportive care",
            {"diarrhea"},
        )
    if "headache" in symptoms_set:
        return _build_medication_for_match(
            risk_level,
            "Headache symptom self-care",
            {"headache"},
        )
    if "fever" in symptoms_set and selected_fever_patterns:
        guide = _build_medication_for_match(risk_level, "Paracetamol", {"fever"})
        pattern_summary = ", ".join(selected_fever_patterns)
        precautions = guide.precautions
        if any(pattern in {"Relapsing fever", "Recurrent fever"} for pattern in selected_fever_patterns):
            precautions += (
                "Fever that returns in separate episodes should be discussed with a qualified health worker to assess the cause.",
            )
        return replace(
            guide,
            note=(
                f"Reported fever pattern: {pattern_summary}. This is a symptom description, not a diagnosis. "
                "Paracetamol may help relieve fever when suitable, but it does not treat the cause; follow the product label "
                "or a healthcare professional's instructions."
            ),
            precautions=precautions,
        )
    if "cough" in symptoms_set and age is not None and age < 6:
        return None
    if "cough" in symptoms_set:
        persistent_cough = re.search(
            r"\b(?:persistent|chronic)\s+cough\b|\b(?:persistent cough|chronic cough)\b",
            context,
        )
        subacute_cough = re.search(r"\bsubacute cough\b", context)
        if persistent_cough or subacute_cough:
            return _build_medication_for_match(
                risk_level,
                "Cough needs clinical review",
                {"cough"},
            )
        prolonged_cough = re.search(
            r"\b(?:14|1[5-9]|[2-9]\d+)\s*days?\b|\b(?:2|[3-9]|\d{2,})\s*weeks?\b",
            context,
        )
        if prolonged_cough:
            return None
    dry_cough = re.search(
        r"\b(?:dry cough|non[- ]productive cough|tuyong ubo|ubo na walang plema)\b",
        context,
    )
    productive_cough = re.search(
        r"\b(?:(?<!non-)productive cough|wet cough|cough with (?:phlegm|sputum)|with phlegm|may plema)\b",
        context,
    )
    allergic_cough = re.search(r"\b(?:allergic cough|allergy-related cough)\b", context)
    acute_or_nocturnal_cough = re.search(
        r"\b(?:acute cough|nocturnal cough|nighttime cough|night cough)\b",
        context,
    )
    if "cough" in symptoms_set and dry_cough and not productive_cough:
        return _build_medication_for_match(risk_level, "Dry cough options", {"dry cough"})
    if "cough" in symptoms_set and productive_cough and not dry_cough:
        return _build_medication_for_match(risk_level, "Productive cough options", {"productive cough"})
    if "cough" in symptoms_set and allergic_cough and not productive_cough:
        return _build_medication_for_match(risk_level, "Dry cough options", {"dry cough"})
    if "cough" in symptoms_set and acute_or_nocturnal_cough and not (dry_cough or productive_cough):
        return _build_medication_for_match(risk_level, "Cough subtype not specified", {"cough"})
    if "cough" in symptoms_set:
        return _build_medication_for_match(risk_level, "Cough subtype not specified", {"cough"})
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
        dosage="No specific OTC medicine is recommended based on these symptoms alone.",
        contraindications=(),
        side_effects=(),
        precautions=(
            "Rest and stay hydrated while monitoring symptoms",
            "Ask a pharmacist or health worker before choosing an over-the-counter medicine",
            "Seek assessment if symptoms persist, worsen, or are accompanied by breathing difficulty or severe pain",
        ),
        note="Symptoms alone may not identify a cause. This guidance does not diagnose or treat an underlying condition.",
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
            "precautions": (
                "Check the product label and ask a pharmacist if it is suitable for your age, weight, and health conditions",
                "Do not combine with other medicines containing paracetamol",
            ),
            "note": "May help relieve mild aches or pain when suitable. It does not treat the cause of the symptoms.",
        },
        "Paracetamol": {
            "dosage": "Use only according to the approved product label or a health professional's instructions.",
            "contraindications": (),
            "side_effects": ("Stomach upset", "Nausea", "Drowsiness"),
            "precautions": (
                "Check the product label and ask a pharmacist if it is suitable for your age, weight, and health conditions",
                "Do not combine with other medicines containing paracetamol",
            ),
            "note": "May help relieve mild aches or pain when suitable. It does not treat the cause of the symptoms.",
        },
        "Dry cough options": {
            "dosage": "No medicine or dose is selected automatically. Ask a pharmacist or health worker which option, if any, is suitable.",
            "contraindications": (),
            "side_effects": ("Side effects vary by medicine; check the product leaflet or ask a pharmacist.",),
            "precautions": (
                "For dry cough only. Antihistamines may cause drowsiness; do not combine cough and cold products without checking their ingredients.",
                "This system does not select a medicine or dose. Confirm suitability with a pharmacist, especially for children, pregnancy, or other health conditions.",
                "Seek medical care for breathing difficulty, worsening symptoms, or a cough lasting more than 14 days.",
            ),
            "note": "Options to discuss (not a combined regimen):\nDextromethorphan — antitussive\nDiphenhydramine — antihistamine\nChlorpheniramine — antihistamine\nCetirizine — antihistamine\nLoratadine — antihistamine",
        },
        "Productive cough options": {
            "dosage": "No medicine or dose is selected automatically. Ask a pharmacist or health worker which option, if any, is suitable.",
            "contraindications": (),
            "side_effects": ("Side effects vary by medicine; check the product leaflet or ask a pharmacist.",),
            "precautions": (
                "For cough with phlegm. Do not combine with a cough suppressant unless a clinician or pharmacist advises it.",
                "This system does not select a medicine or dose. Confirm suitability with a pharmacist, especially for children, pregnancy, or other health conditions.",
                "Seek medical care for breathing difficulty, worsening symptoms, or a cough lasting more than 14 days.",
            ),
            "note": "Options to discuss (not a combined regimen):\nGuaifenesin — expectorant\nCarbocisteine — mucolytic\nAmbroxol — mucolytic / expectorant\nBromhexine — mucolytic\nAcetylcysteine (NAC) — mucolytic\nErdosteine — mucolytic\nLagundi (Vitex negundo) — herbal cough preparation",
        },
        "Cough subtype not specified": {
            "dosage": "No medicine or dose is selected automatically.",
            "contraindications": (),
            "side_effects": (),
            "precautions": (
                "Select dry cough or cough with phlegm to see relevant options, or ask a pharmacist or health worker.",
                "Seek medical care for breathing difficulty, worsening symptoms, or a cough lasting more than 14 days.",
            ),
            "note": "Cough medicines differ by cough type. The system cannot determine which type applies from 'cough' alone.",
        },
        "Cough needs clinical review": {
            "dosage": "No cough medicine or dose is selected. Arrange assessment by a qualified health worker.",
            "contraindications": (),
            "side_effects": (),
            "precautions": (
                "A subacute, persistent, or chronic cough needs clinical assessment rather than self-treatment from this guide.",
                "Seek prompt medical care if cough worsens or occurs with breathing difficulty, chest pain, blood in sputum, or high fever.",
            ),
            "note": "This cough classification is a reason to seek clinical assessment; it does not identify the cause or a diagnosis.",
        },
        "Diarrhea needs clinical review": {
            "dosage": "No diarrhea medicine or dose is selected. Arrange assessment by a qualified health worker.",
            "contraindications": (),
            "side_effects": (),
            "precautions": (
                "Persistent diarrhea (14 days or longer) or chronic diarrhea (more than 4 weeks) needs clinical assessment rather than self-treatment from this guide.",
                "Continue fluids or oral rehydration solution according to its package instructions if able to drink.",
                "Seek urgent care for blood in stool, severe dehydration, inability to keep fluids down, severe abdominal pain, or worsening symptoms.",
            ),
            "note": "This duration classification is a reason to seek clinical assessment; it does not identify the cause or a diagnosis.",
        },
        "Vomiting needs clinical review": {
            "dosage": "No vomiting medicine or dose is selected. Arrange assessment by a qualified health worker.",
            "contraindications": (),
            "side_effects": (),
            "precautions": (
                "Persistent vomiting (7 days or longer) or chronic/recurrent vomiting needs clinical assessment rather than self-treatment from this guide.",
                "Use small, frequent sips of oral rehydration solution if the person is alert and able to drink.",
                "Seek urgent care for inability to keep fluids down, signs of dehydration, blood or coffee-ground material in vomit, green vomit, severe abdominal pain, or worsening symptoms.",
            ),
            "note": "This duration classification is a reason to seek clinical assessment; it does not identify the cause or a diagnosis.",
        },
        "Motion sickness vomiting support": {
            "dosage": "Use oral rehydration solution in frequent, small sips. No meclizine dose is selected automatically.",
            "contraindications": (),
            "side_effects": ("Meclizine may cause drowsiness, dry mouth, headache, fatigue, blurred vision, or dizziness.",),
            "precautions": (
                "Meclizine is only a possible option for motion sickness, not for every cause of vomiting. Ask a pharmacist to confirm the specific product and directions.",
                "Adult reference information only. Do not use this guidance to dose a child.",
                "Avoid alcohol and sedatives, and do not drive if drowsy. Ask a healthcare professional first with glaucoma, enlarged prostate, or urinary difficulty.",
                "Seek urgent care for green or bloody vomit, coffee-ground material, inability to keep fluids down, or signs of dehydration.",
            ),
            "note": "ORS supports fluid replacement. Meclizine is shown only as pharmacist-guided information for adult motion sickness and is not selected as treatment.",
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
            "dosage": "Dissolve the sachet in the exact amount of clean water shown on the packet. For vomiting, start with frequent, small sips; if vomiting occurs, pause briefly and restart more slowly. Never change the dilution.",
            "contraindications": (),
            "side_effects": ("Nausea", "Vomiting if consumed too quickly", "Electrolyte imbalance if improperly prepared", "Fluid overload in susceptible patients"),
            "precautions": (
                "Use clean drinking water and do not add extra sugar or salt.",
                "People with significant kidney or heart disease may need individualized fluid advice.",
                "Seek urgent medical assessment if fluids cannot be retained or there are signs of severe dehydration.",
            ),
            "note": "ORS supports fluid and electrolyte replacement for vomiting or diarrhea; it does not treat the underlying cause or replace medical assessment.",
        },
        "Diarrhea supportive care": {
            "dosage": "ORS is the first-line supportive option. Prepare and use it exactly as directed on the specific product. No anti-diarrheal or probiotic dose is selected automatically.",
            "contraindications": (),
            "side_effects": ("Possible effects vary by product; check its information and ask a pharmacist or healthcare professional.",),
            "precautions": (
                "The options shown are informational, not a combined treatment plan. Discuss zinc or probiotics with a healthcare professional, particularly for children or people with significant health conditions.",
                "Do not use loperamide for bloody diarrhea, high fever, or persistent diarrhea unless specifically directed by a clinician.",
                "Seek medical assessment for bloody or black, tarry stools, high fever, severe abdominal pain, persistent vomiting, signs of dehydration, very little or no urine, severe weakness or dizziness, or worsening symptoms.",
                "Seek medical assessment if diarrhea lasts more than 48 hours without improvement.",
            ),
            "note": "ORS is the priority to replace fluid losses. Additional products are not suitable for everyone and should not delay medical assessment.",
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
        "Cold symptom self-care": {
            "dosage": "No medicine or dose is selected automatically. Cold medicine references are for adults only and are filtered by the reported symptoms.",
            "contraindications": (),
            "side_effects": ("Possible effects vary by medicine; review its catalog profile and ask a pharmacist.",),
            "precautions": (
                "The references are not a combined regimen, and adult doses must not be used for children.",
                "Check combination products to avoid taking paracetamol twice or duplicating decongestants.",
                "Confirm product registration and local regulatory classification with a pharmacist; pseudoephedrine status varies.",
                "Oral phenylephrine effectiveness for nasal congestion is uncertain.",
                "If using a nasal decongestant spray, follow the product-specific maximum duration to reduce rebound congestion.",
                "Rest and drink fluids; seek medical assessment if symptoms are severe, worsening, or last more than one week.",
            ),
            "note": "Informational adult references matched to selected cold symptoms; they do not identify or treat the cause. No medication is automatically chosen.",
        },
        "Headache symptom self-care": {
            "dosage": "No medicine or dose is selected automatically. The catalog contains adult reference information only; ask a pharmacist or healthcare professional which option, if any, is suitable.",
            "contraindications": (),
            "side_effects": ("Possible effects vary by medicine; review its catalog profile and ask a pharmacist.",),
            "precautions": (
                "The options are alternatives, not a combination regimen. Do not combine ibuprofen, naproxen, aspirin, or other NSAIDs.",
                "Adult dosing information is not for children or teenagers. Seek age- and weight-specific guidance.",
                "Avoid aspirin in children or teenagers with viral illness and if dengue is suspected because of Reye's syndrome and bleeding risks.",
                "NSAIDs may be unsuitable with ulcers or bleeding, kidney or heart disease, uncontrolled hypertension, blood thinners, or pregnancy; check the individual profile.",
                "For routine adult self-treatment, the paracetamol reference prefers a maximum of 3,000 mg in 24 hours; follow the product label and avoid duplicate paracetamol-containing products.",
                "Seek urgent assessment for sudden, severe, new, or worsening headache, or headache with weakness, confusion, vision changes, stiff neck, or repeated vomiting.",
            ),
            "note": "Informational options for headache relief only; these medicines do not determine or treat the underlying cause.",
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
        "Pharmacist advice for itchy skin": {
            "dosage": "No medicine or dose is selected automatically.",
            "contraindications": (),
            "side_effects": (),
            "precautions": (
                *_RASH_CARE_PRECAUTIONS,
                "For itching or hives that may be allergy-related, ask a pharmacist whether cetirizine or loratadine is appropriate; they are alternatives, not a combination regimen.",
            ),
            "note": "The selected itchiness classification can occur with allergy, but does not confirm the cause. No medicine is selected automatically.",
        },
        "Non-drug skin care": {
            "dosage": "No medicine or dose is selected automatically.",
            "contraindications": (),
            "side_effects": (),
            "precautions": _RASH_CARE_PRECAUTIONS,
            "note": "Rashes have many possible causes. Supportive skin care is shown; a specific OTC treatment cannot be selected from rash or redness alone.",
        },
        "Rash with systemic symptoms — medical review": {
            "dosage": "No medicine or dose is selected. Arrange medical assessment.",
            "contraindications": (),
            "side_effects": (),
            "precautions": _RASH_CARE_PRECAUTIONS,
            "note": "A rash with fever, headache, eye pain, or body aches needs medical assessment, including consideration of dengue. Do not rely on antihistamines or creams to treat the cause.",
        },
        "Rash warning signs — urgent assessment": {
            "dosage": "No medicine or dose is selected. Seek emergency medical care now.",
            "contraindications": (),
            "side_effects": (),
            "precautions": _RASH_CARE_PRECAUTIONS,
            "note": "A reported rash warning sign may indicate a severe allergic reaction, serious skin reaction, or infection. Seek emergency medical care now; do not rely on antihistamines or creams.",
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


def _duration_value_for_unit(unit: str) -> int:
    normalized = (unit or "").lower()
    if normalized.startswith("hour") or normalized in {"oras", "orasan", "hr", "hrs"}:
        return 1 / 24
    if normalized.startswith("week") or normalized in {"linggo", "linggo na"}:
        return 7
    if normalized.startswith("month") or normalized in {"buwan", "buwan na"}:
        return 30
    if normalized.startswith("day") or normalized in {"araw", "aldaw", "adlaw"}:
        return 1
    return 1


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
        duration_days = amount * _duration_value_for_unit(unit)
    duration_score = 0
    if duration_days is not None:
        typed_duration = bool(duration_match and re.search(r"[a-z]", duration_match.group(0)) and not re.search(r"\d", duration_match.group(0)))
        if duration_days <= 1:
            duration_score = 1
        elif duration_days <= 3:
            if detected_terms == {"cough"} and typed_duration:
                duration_score = 3
            else:
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

    if (
        level == "YELLOW"
        and adjusted_score >= YELLOW_SCORE_THRESHOLD
        and not (headache_review_rules or gastrointestinal_review_rules)
    ):
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
