from __future__ import annotations

import pytest

from app.nlp import engine, specialist_adapter
from app.nlp.lexicon import LexiconEntry


def _entry() -> LexiconEntry:
    return LexiconEntry(
        local_term="chest pain",
        language="en",
        medical_term="chest pain",
        severity_weight=3,
        category="cardiopulmonary",
    )


def _write_lexicon(path, content: str):
    path.write_text(content, encoding="utf-8")
    return path


def test_specialist_spelling_variant_maps_to_exact_canonical_base_only(tmp_path, monkeypatch) -> None:
    path = _write_lexicon(
        tmp_path / "LEXICON",
        "{base=chest pain\nspelling_variant=chest-pain\n}\n"
        "{base=unmapped diagnosis\nspelling_variant=thoracic discomfort\n}\n",
    )
    monkeypatch.setattr(specialist_adapter.settings, "specialist_lexicon_path", path)

    matches = specialist_adapter.find_matches("chest-pain", [_entry()])

    assert [(item.match.medical_term, item.match.severity_weight) for item in matches] == [
        ("chest pain", 3)
    ]


@pytest.mark.parametrize("input_text", ["no chest-pain", "no    chest-pain"])
def test_engine_does_not_restore_negated_specialist_symptom(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
    input_text: str,
) -> None:
    path = _write_lexicon(
        tmp_path / "LEXICON",
        "{base=chest pain\nspelling_variant=chest-pain\n}\n",
    )
    monkeypatch.setattr(specialist_adapter.settings, "specialist_lexicon_path", path)
    monkeypatch.setattr(engine.scispacy_adapter, "is_available", lambda: False)
    monkeypatch.setattr(engine, "extract_symptoms", lambda *_args: {
        "detected_symptoms": [],
        "negated_symptoms": [],
        "language_detected": "en",
        "onset": {"days_since_onset": None},
    })

    result = engine.analyze(input_text, [], [_entry()])

    assert result.matches == []


def test_specialist_maps_native_base_and_spelling_variant(tmp_path, monkeypatch) -> None:
    path = _write_lexicon(
        tmp_path / "LEXICON",
        "{base=headache\nspelling_variant=head ache\n}\n",
    )
    monkeypatch.setattr(specialist_adapter.settings, "specialist_lexicon_path", path)
    headache = LexiconEntry(
        local_term="headache",
        language="en",
        medical_term="headache",
        severity_weight=2,
        category="neurologic",
    )

    matches = specialist_adapter.find_matches("head ache", [headache])

    assert [item.match.medical_term for item in matches] == ["headache"]


def test_specialist_skips_ambiguous_spelling_variants(tmp_path, monkeypatch) -> None:
    path = _write_lexicon(
        tmp_path / "LEXICON",
        "{base=chest pain\nspelling_variant=shared phrase\n}\n"
        "{base=headache\nspelling_variant=shared phrase\n}\n",
    )
    monkeypatch.setattr(specialist_adapter.settings, "specialist_lexicon_path", path)
    headache = LexiconEntry(
        local_term="headache",
        language="en",
        medical_term="headache",
        severity_weight=2,
        category="neurologic",
    )

    matches = specialist_adapter.find_matches("shared phrase", [_entry(), headache])

    assert matches == []


def test_specialist_reports_configured_missing_file(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        specialist_adapter.settings,
        "specialist_lexicon_path",
        tmp_path / "missing-LEXICON",
    )

    with pytest.raises(FileNotFoundError, match="SPECIALIST Lexicon file was not found"):
        specialist_adapter.is_available()


def test_specialist_is_inactive_without_configured_file(monkeypatch) -> None:
    monkeypatch.setattr(specialist_adapter.settings, "specialist_lexicon_path", None)

    assert specialist_adapter.is_available() is False
