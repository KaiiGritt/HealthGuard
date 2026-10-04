"""Orchestrates the NLP + rule pipeline.

Flow:  raw input  ->  tokenize (NLTK)  ->  lexicon match (Layer 2)
                  ->  [optional] scispaCy normalize (Layer 1)  ->  rule classification.

`analyze()` is DB-agnostic: it takes the lexicon entries as plain data, so it can be
unit-tested standalone (see run_engine_smoketest.py) or fed rows from MySQL.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import scispacy_adapter
from .extractor import extract_symptoms
from .lexicon import LexiconEntry, Match, match_selected, match_text
from .rules import Classification, classify, emergency_terms_from_text


@dataclass
class EngineResult:
    matches: list[Match]
    classification: Classification
    scispacy_active: bool
    symptom_extraction: dict


def analyze(
    input_text: str,
    selected_symptoms: list[str],
    entries: list[LexiconEntry],
    age: int | None = None,
    age_months: int | None = None,
    sex: str | None = None,
    duration_days: float | None = None,
    pregnancy_status: str | None = None,
) -> EngineResult:
    """Run the full pipeline and return matches + classification."""
    matches: list[Match] = []
    seen: set[str] = set()
    symptom_extraction = extract_symptoms(input_text, entries)
    negated_terms = {item["canonical_term"] for item in symptom_extraction["negated_symptoms"]}
    entries_by_term: dict[str, LexiconEntry] = {}
    for entry in entries:
        if entry.medical_term not in entries_by_term or entry.language.lower() == "en":
            entries_by_term[entry.medical_term] = entry

    def add(new: list[Match]) -> None:
        for m in new:
            if m.medical_term not in seen:
                seen.add(m.medical_term)
                matches.append(m)

    if input_text:
        add([
            Match(
                medical_term=term,
                matched_text=term,
                language="en",
                category="emergency",
                severity_weight=6,
            )
            for term in emergency_terms_from_text(input_text)
        ])
        add([match for match in match_text(input_text, entries) if match.medical_term not in negated_terms])
        extracted_matches = []
        for symptom in symptom_extraction["detected_symptoms"]:
            entry = entries_by_term.get(symptom["canonical_term"])
            if entry is None:
                continue
            extracted_matches.append(
                Match(
                    medical_term=entry.medical_term,
                    matched_text=symptom["raw_phrase"],
                    language=symptom_extraction["language_detected"],
                    category=entry.category,
                    severity_weight=entry.severity_weight,
                )
            )
        add(extracted_matches)
    if selected_symptoms:
        add(match_selected(selected_symptoms, entries))

    # Layer 1 (optional): normalize detected terms via scispaCy if available.
    # Dormant on Python 3.14 — leaves matches unchanged.
    active = scispacy_adapter.is_available()
    if active and matches:
        _ = scispacy_adapter.normalize_terms([m.medical_term for m in matches])

    effective_duration_days = duration_days
    if effective_duration_days is None:
        extracted_days = symptom_extraction["onset"]["days_since_onset"]
        if extracted_days is not None:
            effective_duration_days = extracted_days

    classification = classify(
        matches,
        age=age,
        age_months=age_months,
        sex=sex,
        input_text=input_text,
        duration_days=effective_duration_days,
        pregnancy_status=pregnancy_status,
    )
    return EngineResult(
        matches=matches,
        classification=classification,
        scispacy_active=active,
        symptom_extraction=symptom_extraction,
    )
