from __future__ import annotations

from app.nlp import engine
from app.nlp.lexicon import LexiconEntry
from app.nlp.scispacy_adapter import BiomedicalEntity


def _empty_extraction() -> dict:
    return {
        "detected_symptoms": [],
        "negated_symptoms": [],
        "language_detected": "en",
        "onset": {"days_since_onset": None},
    }


def test_scispacy_entity_matches_existing_symptom_entry(monkeypatch) -> None:
    entries = [
        LexiconEntry(
            local_term="chest pain",
            language="en",
            medical_term="chest pain",
            severity_weight=3,
            category="cardiopulmonary",
        )
    ]
    monkeypatch.setattr(engine, "extract_symptoms", lambda *_args: _empty_extraction())
    monkeypatch.setattr(engine.scispacy_adapter, "is_available", lambda: True)
    monkeypatch.setattr(
        engine.scispacy_adapter,
        "extract_entities",
        lambda _text: [BiomedicalEntity("chest pains", "chest pain", 11)],
    )

    result = engine.analyze("patient has chest pains", [], entries)

    assert result.scispacy_active is True
    assert [(match.medical_term, match.severity_weight) for match in result.matches] == [
        ("chest pain", 3)
    ]


def test_scispacy_ignores_entities_without_a_symptom_lexicon_match(monkeypatch) -> None:
    monkeypatch.setattr(engine, "extract_symptoms", lambda *_args: _empty_extraction())
    monkeypatch.setattr(engine.scispacy_adapter, "is_available", lambda: True)
    monkeypatch.setattr(
        engine.scispacy_adapter,
        "extract_entities",
        lambda _text: [BiomedicalEntity("unknown entity", "unknown entity", 0)],
    )

    result = engine.analyze("unknown entity", [], [])

    assert result.matches == []


def test_scispacy_does_not_restore_negated_symptom(monkeypatch) -> None:
    entries = [
        LexiconEntry(
            local_term="chest pain",
            language="en",
            medical_term="chest pain",
            severity_weight=3,
            category="cardiopulmonary",
        )
    ]
    monkeypatch.setattr(engine, "extract_symptoms", lambda *_args: _empty_extraction())
    monkeypatch.setattr(engine.scispacy_adapter, "is_available", lambda: True)
    monkeypatch.setattr(
        engine.scispacy_adapter,
        "extract_entities",
        lambda _text: [BiomedicalEntity("chest pains", "chest pain", 3)],
    )

    result = engine.analyze("no chest pains", [], entries)

    assert result.matches == []
