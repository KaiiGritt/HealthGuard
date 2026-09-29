from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

from app.nlp.extractor import extract_symptoms
from app.nlp.lexicon import LexiconEntry
from app.routers.assessment import analyze_symptoms, extract_symptom_text
from app.schemas import AnalyzeRequest, SymptomExtractionRequest, SymptomExtractionResult
from app.seed import LEXICON_SEED


LEXICON = [LexiconEntry(**entry) for entry in LEXICON_SEED]


def test_extracts_tagalog_inflection_and_explicit_duration() -> None:
    result = extract_symptoms("sinisipon po ako tapos may sakit ulo, 3 days na", LEXICON)

    assert result["language_detected"] == "tl"
    assert [(item["canonical_term"], item["source"]) for item in result["detected_symptoms"]] == [
        ("colds / rhinitis", "lexicon"),
        ("headache", "inferred"),
    ]
    assert result["onset"] == {"raw_phrase": "3 days na", "days_since_onset": 3.0, "approximate": False}
    assert result["unmapped_terms"][0]["raw_phrase"] == "may sakit ulo"


def test_separates_bicol_negation_and_red_flags() -> None:
    result = extract_symptoms(
        "grabe an sakit sa daghan, mayong lagnat, tatlong aldaw na, dae na makahangos",
        LEXICON,
    )

    assert result["language_detected"] == "bcl"
    assert {item["canonical_term"] for item in result["detected_symptoms"]} == {
        "chest pain",
        "difficulty breathing",
    }
    assert result["negated_symptoms"] == [{"raw_phrase": "mayong lagnat", "canonical_term": "fever"}]
    assert result["onset"] == {"raw_phrase": "tatlong aldaw na", "days_since_onset": 3.0, "approximate": False}
    assert "grabe" in result["severity_modifiers"]
    assert {"chest pain", "difficulty breathing"}.issubset(result["red_flags"])


def test_marks_hedged_symptom_and_vague_onset_approximate() -> None:
    result = extract_symptoms("parang may lagnat, ilang araw na", LEXICON)

    fever = result["detected_symptoms"][0]
    assert fever["canonical_term"] == "fever"
    assert fever["raw_phrase"] == "parang may lagnat"
    assert fever["hedged"] is True
    assert fever["confidence"] < 0.7
    assert result["onset"] == {"raw_phrase": "ilang araw na", "days_since_onset": None, "approximate": True}


def test_no_symptoms_returns_empty_extraction_with_note() -> None:
    result = extract_symptoms("hello", LEXICON)

    assert result["detected_symptoms"] == []
    assert result["negated_symptoms"] == []
    assert result["reviewer_note"]


def test_negated_severity_and_red_flags_stay_out_of_present_signals() -> None:
    result = extract_symptoms("hindi naman umuubo at walang mataas na lagnat", LEXICON)

    assert {item["canonical_term"] for item in result["negated_symptoms"]} == {"cough", "fever"}
    assert result["detected_symptoms"] == []
    assert result["red_flags"] == []


def test_unmapped_fever_voice_to_text_variant_is_inferred_for_review() -> None:
    result = extract_symptoms("May lagnad ako", LEXICON)

    assert result["detected_symptoms"][0]["canonical_term"] == "fever"
    assert result["detected_symptoms"][0]["source"] == "inferred"
    assert result["unmapped_terms"][0]["raw_phrase"] == "lagnad"


def test_extraction_serializes_to_the_exact_response_schema() -> None:
    result = SymptomExtractionResult.model_validate(extract_symptoms("parang may lagnat", LEXICON))

    assert result.language_detected == "tl"
    assert not hasattr(result, "risk_level")


def test_extract_endpoint_uses_only_approved_community_mappings() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(
            local_term="malabo ang paningin",
            language="tl",
            medical_term="blurred vision",
            severity_weight=1,
            category="vision",
        )
    ]

    result = extract_symptom_text(SymptomExtractionRequest(input_text="malabo ang paningin"), db)

    assert result.detected_symptoms[0].canonical_term == "blurred vision"
    assert result.detected_symptoms[0].source == "lexicon"
    assert result.unmapped_terms == []


def test_assessment_result_includes_hedged_match_confidence() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry) for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(AnalyzeRequest(input_text="parang may lagnat"), db, None)

    assert result.detected_symptoms[0].medical_term == "fever"
    assert result.detected_symptoms[0].confidence == 0.62