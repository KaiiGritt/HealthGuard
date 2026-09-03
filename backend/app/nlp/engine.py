"""Orchestrates the NLP + rule pipeline.

Flow:  raw input  ->  tokenize (NLTK)  ->  lexicon match (Layer 2)
                  ->  [optional] scispaCy normalize (Layer 1)  ->  rule classification.

`analyze()` is DB-agnostic: it takes the lexicon entries as plain data, so it can be
unit-tested standalone (see run_engine_smoketest.py) or fed rows from MySQL.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import scispacy_adapter
from .lexicon import LexiconEntry, Match, match_selected, match_text
from .rules import Classification, classify


@dataclass
class EngineResult:
    matches: list[Match]
    classification: Classification
    scispacy_active: bool


def analyze(
    input_text: str,
    selected_symptoms: list[str],
    entries: list[LexiconEntry],
    age: int | None = None,
    sex: str | None = None,
    duration_days: float | None = None,
    pregnant: bool = False,
    temperature_c: float | None = None,
    oxygen_saturation: float | None = None,
    heart_rate: int | None = None,
    systolic_bp: int | None = None,
) -> EngineResult:
    """Run the full pipeline and return matches + classification."""
    matches: list[Match] = []
    seen: set[str] = set()

    def add(new: list[Match]) -> None:
        for m in new:
            if m.medical_term not in seen:
                seen.add(m.medical_term)
                matches.append(m)

    if input_text:
        add(match_text(input_text, entries))
    if selected_symptoms:
        add(match_selected(selected_symptoms, entries))

    # Layer 1 (optional): normalize detected terms via scispaCy if available.
    # Dormant on Python 3.14 — leaves matches unchanged.
    active = scispacy_adapter.is_available()
    if active and matches:
        _ = scispacy_adapter.normalize_terms([m.medical_term for m in matches])

    classification = classify(
        matches,
        age=age,
        sex=sex,
        input_text=input_text,
        duration_days=duration_days,
        pregnant=pregnant,
        temperature_c=temperature_c,
        oxygen_saturation=oxygen_saturation,
        heart_rate=heart_rate,
        systolic_bp=systolic_bp,
    )
    return EngineResult(matches=matches, classification=classification, scispacy_active=active)
