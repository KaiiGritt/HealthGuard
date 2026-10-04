from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

from app.nlp.extractor import extract_patient_age, extract_symptoms, is_non_symptom_question
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


def test_extracts_kwf_documented_sorsoganon_fever_term() -> None:
    result = extract_symptoms("kalintura", LEXICON)

    assert result["language_detected"] == "srv"
    assert [(item["canonical_term"], item["raw_phrase"]) for item in result["detected_symptoms"]] == [
        ("fever", "kalintura")
    ]


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


def test_extracts_short_bicol_breathing_phrases() -> None:
    for phrase in ("dae makahangos", "dae nakahangos"):
        result = extract_symptoms(phrase, LEXICON)

        assert result["language_detected"] == "bcl"
        assert {item["canonical_term"] for item in result["detected_symptoms"]} == {
            "difficulty breathing"
        }
        assert "difficulty breathing" in result["red_flags"]


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


def test_negation_respects_contrast_and_persistent_symptom_idioms() -> None:
    cases = {
        "no fever but cough for 3 days": ({"cough"}, {"fever"}),
        "walang tigil ang ubo ko": ({"cough"}, set()),
        "hindi bumababa ang lagnat ko": ({"fever"}, set()),
    }

    for text, (expected_present, expected_negated) in cases.items():
        result = extract_symptoms(text, LEXICON)
        present = {item["canonical_term"] for item in result["detected_symptoms"]}
        negated = {item["canonical_term"] for item in result["negated_symptoms"]}
        assert present == expected_present
        assert negated == expected_negated


def test_text_danger_sign_alias_is_extracted_for_unable_to_drink() -> None:
    result = extract_symptoms("di makainom anak ko", LEXICON)

    assert {item["canonical_term"] for item in result["detected_symptoms"]} == {"unable to drink"}
    assert "unable to keep fluids down" in result["red_flags"]


def test_reported_spelling_and_code_mix_variants_are_extracted() -> None:
    cases = {
        "fevr and coff for 2 days": {"fever", "cough"},
        "masakit ang tyan ko at nagsusuka": {"abdominal pain", "vomiting"},
        "sakt ng ulo at lagnat": {"headache", "fever"},
        "l a g n a t": {"fever"},
        "lagnаt 3 araw": {"fever"},
        "%3Cb%3Elagnat%3C%2Fb%3E": {"fever"},
        "sumasakit ang tummy ko, nag-vomit ako": {"abdominal pain", "vomiting"},
    }

    for text, expected in cases.items():
        result = extract_symptoms(text, LEXICON)
        assert {item["canonical_term"] for item in result["detected_symptoms"]} == expected


def test_explicit_person_ages_are_not_symptom_durations() -> None:
    assert extract_patient_age("lola ko 78, lagnat at ubo") == 78
    assert extract_patient_age("anak ko 2 taong gulang, nagtatae") == 2
    assert extract_patient_age("baby ko 3 buwan, may lagnat") == 0
    assert extract_patient_age("3 months old, fever") == 0
    assert extract_patient_age("ako ay 65 taong gulang, may lagnat") == 65
    assert extract_patient_age("1 taon 2 buwan na anak ko, nagtatae") == 1

    infant_fever = extract_symptoms("baby ko 3 buwan, may lagnat", LEXICON)
    compound_age = extract_symptoms("1 taon 2 buwan na anak ko, nagtatae", LEXICON)
    cough_duration = extract_symptoms("ubo 2 buwan", LEXICON)

    assert infant_fever["onset"]["days_since_onset"] is None
    assert compound_age["onset"]["days_since_onset"] is None
    assert cough_duration["onset"]["days_since_onset"] == 60


def test_hour_and_one_week_duration_forms_are_parsed() -> None:
    four_hours = extract_symptoms("lagnat 4 oras", LEXICON)
    four_hours_with_na = extract_symptoms("temp 40, lagnat 4 na oras", LEXICON)
    one_week = extract_symptoms("lagnat isang linggo", LEXICON)

    assert four_hours["onset"]["days_since_onset"] == 4 / 24
    assert four_hours_with_na["onset"]["days_since_onset"] == 4 / 24
    assert one_week["onset"]["days_since_onset"] == 7


def test_information_and_uncertainty_questions_are_not_assessment_text() -> None:
    assert is_non_symptom_question("ano ang gamot sa ubo?")
    assert is_non_symptom_question("ano ang lagnat?")
    assert is_non_symptom_question("hindi ko alam kung may lagnat ako")
    assert not is_non_symptom_question("may lagnat ako at ubo")


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