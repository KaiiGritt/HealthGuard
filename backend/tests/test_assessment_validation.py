from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.nlp.lexicon import LexiconEntry, Match, match_text
from app.nlp.engine import analyze
from app.nlp.rules import classify, has_supported_symptom_input
from app.routers.assessment import analyze_symptoms
from app.schemas import AnalyzeRequest
from app.seed import LEXICON_SEED, SELECTABLE_SYMPTOMS


def test_analyze_request_accepts_age_and_sex() -> None:
    payload = AnalyzeRequest(
        input_text="fever",
        selected_symptoms=["fever"],
        method="text",
        age=30,
        sex="female",
    )

    assert payload.age == 30
    assert payload.sex == "female"


def test_unsupported_input_is_rejected() -> None:
    assert has_supported_symptom_input("I don't have money", []) is False
    assert has_supported_symptom_input("I have fever and cough", []) is True
    assert has_supported_symptom_input("May lagnat at ubo ako", []) is True
    assert has_supported_symptom_input("May pananakit ng ulo at hingal ako", []) is True
    assert has_supported_symptom_input("", ["fever"]) is True


def test_tagalog_inflections_resolve_to_canonical_symptom_roots() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    matches = match_text(
        "Nilalagnat ako, inuubo, sumasakit ang ulo, masakit ang sikmura, nasusuka, nagtatae, at hinihingal.",
        entries,
    )

    assert {match.medical_term for match in matches} == {
        "fever",
        "cough",
        "headache",
        "abdominal pain",
        "vomiting",
        "diarrhea",
        "difficulty breathing",
    }
    roots = {match.matched_text for match in matches}
    assert roots == {"lagnat", "ubo", "ulo", "tiyan", "suka", "tae", "hingal"}


def test_spaced_tagalog_phrase_is_detected() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    matches = match_text("inuubo ako at nag susuka isang linggo na", entries)

    assert {match.medical_term for match in matches} == {"cough", "vomiting"}
    assert {match.matched_text for match in matches} == {"ubo", "suka"}


def test_new_tagalog_alias_is_detected_without_seeded_alias_row() -> None:
    canonical_entries = [
        LexiconEntry(**entry)
        for entry in LEXICON_SEED
        if entry["language"] == "en"
    ]
    matches = match_text("inuubo at nagsusuka ako", canonical_entries)

    assert {match.medical_term for match in matches} == {"cough", "vomiting"}


def test_engine_uses_extractor_for_voice_to_text_and_bicol_aliases() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    fever = analyze("lagnad", [], entries)
    breathing = analyze("dae na makahangos", [], entries)

    assert {match.medical_term for match in fever.matches} == {"fever"}
    assert {match.medical_term for match in breathing.matches} == {"difficulty breathing"}


def test_engine_maps_additional_extractor_canonicals_to_triage_terms() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze(
        "sinisipon, nangangalay, nahihilo, nanlalambot ang katawan, sakit sa dibdib, masakit an daghan, paninikip ng dibdib",
        [],
        entries,
    )

    assert {match.medical_term for match in result.matches} == {
        "colds / rhinitis",
        "muscle ache / body soreness",
        "dizziness",
        "generalized weakness",
        "chest pain",
        "chest tightness",
    }


def test_chest_pain_and_tightness_trigger_red_flag_override() -> None:
    chest_pain = Match(medical_term="chest pain", matched_text="chest pain", language="en", category="cardiopulmonary", severity_weight=3)
    chest_tightness = Match(medical_term="chest tightness", matched_text="chest tightness", language="en", category="cardiopulmonary", severity_weight=3)

    assert classify([chest_pain]).risk_level == "RED"
    assert classify([chest_tightness]).risk_level == "RED"


def test_engine_does_not_match_explicitly_negated_symptoms() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("walang lagnat", [], entries)

    assert "fever" not in {match.medical_term for match in result.matches}
    assert result.symptom_extraction["negated_symptoms"] == [
        {"raw_phrase": "walang lagnat", "canonical_term": "fever"}
    ]


def test_typed_tagalog_duration_contributes_to_triage_score() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("may ubo ako, tatlong araw na", [], entries)

    assert result.classification.score == 3
    assert "duration-score" in {rule.name for rule in result.classification.triggered_rules}


def test_vague_typed_duration_is_not_assigned_a_precise_score() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("may ubo ako, ilang araw na", [], entries)

    assert result.classification.score == 1
    assert "duration-score" not in {rule.name for rule in result.classification.triggered_rules}


def test_explicit_duration_value_overrides_duration_from_text() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("may ubo ako, tatlong araw na", [], entries, duration_days=1)

    assert result.classification.score == 2


def test_combination_rules_raise_urgency_for_common_clusters() -> None:
    fever = Match(medical_term="fever", matched_text="lagnat", language="tl", category="general", severity_weight=2)
    cough = Match(medical_term="cough", matched_text="ubo", language="tl", category="respiratory", severity_weight=1)
    breathing = Match(medical_term="difficulty breathing", matched_text="hirap huminga", language="tl", category="respiratory", severity_weight=4)
    yellow = classify([fever, cough])
    red = classify([breathing, fever])

    assert yellow.risk_level == "YELLOW"
    assert red.risk_level == "RED"


def test_chest_pain_is_supported_but_bloody_stool_remains_unmapped() -> None:
    assert has_supported_symptom_input("I have chest pain", []) is True
    assert has_supported_symptom_input("I have bloody stool", []) is False


def test_canonical_lexicon_contains_only_selectable_symptoms() -> None:
    lexicon_terms = {entry["medical_term"] for entry in LEXICON_SEED}
    assert set(SELECTABLE_SYMPTOMS) <= lexicon_terms
    assert {
        "colds / rhinitis",
        "chest pain",
        "chest tightness",
        "muscle ache / body soreness",
        "generalized weakness",
        "dizziness",
    } <= lexicon_terms


def test_duration_and_worsening_rules_raise_mild_symptoms() -> None:
    cough = Match(medical_term="cough", matched_text="cough", language="en", category="respiratory", severity_weight=1)

    result = classify([cough], input_text="My cough has lasted 31 days and is getting worse.")

    assert result.risk_level == "YELLOW"
    assert {rule.name for rule in result.triggered_rules} >= {"persistent-cough", "worsening-symptoms"}


def test_resident_request_rejects_uncollected_vitals_and_pregnancy() -> None:
    from pydantic import ValidationError

    try:
        AnalyzeRequest(
            input_text="fever",
            selected_symptoms=["fever"],
            method="text",
            temperature_c=40,
            oxygen_saturation=88,
            heart_rate=140,
            systolic_bp=80,
            pregnant=True,
        )
    except ValidationError:
        return
    raise AssertionError("Uncollected resident inputs must not be accepted")


def test_assessment_endpoint_recognizes_extractor_alias() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry, review_status="approved") for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(AnalyzeRequest(input_text="lagnad"), db, None)

    assert result.detected_symptoms[0].medical_term == "fever"
    assert result.detected_symptoms[0].confidence == 0.82


def test_assessment_endpoint_rejects_negated_only_symptoms() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry, review_status="approved") for entry in LEXICON_SEED
    ]

    with pytest.raises(HTTPException) as error:
        analyze_symptoms(AnalyzeRequest(input_text="walang lagnat"), db, None)

    assert error.value.status_code == 422
    assert "absent" in error.value.detail


def test_assessment_endpoint_accepts_extractor_only_sipon_mapping() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry, review_status="approved") for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(AnalyzeRequest(input_text="sinisipon"), db, None)

    assert result.detected_symptoms[0].medical_term == "colds / rhinitis"


def test_negated_severity_language_does_not_escalate() -> None:
    cough = Match(medical_term="cough", matched_text="cough", language="en", category="respiratory", severity_weight=1)

    result = classify([cough], input_text="I do not have severe cough and it is not worsening.")

    assert "severe-or-worsening-language" not in {rule.name for rule in result.triggered_rules}
    assert "worsening-symptoms" not in {rule.name for rule in result.triggered_rules}


def test_weighted_score_and_duration_rules() -> None:
    cough = Match(medical_term="cough", matched_text="cough", language="en", category="respiratory", severity_weight=1)
    headache = Match(medical_term="headache", matched_text="headache", language="en", category="neurological", severity_weight=2)
    fever = Match(medical_term="fever", matched_text="fever", language="en", category="general", severity_weight=2)
    breathing = Match(medical_term="difficulty breathing", matched_text="difficulty breathing", language="en", category="respiratory", severity_weight=6)

    assert classify([cough, headache]).risk_level == "YELLOW"
    assert classify([fever, cough]).risk_level == "YELLOW"
    assert any(rule.name == "symptom-combination-score" for rule in classify([fever, cough]).triggered_rules)
    assert any(rule.name == "weighted-symptom-score" for rule in classify([fever, cough]).triggered_rules)
    assert classify([fever, cough, headache]).risk_level == "YELLOW"
    assert classify([breathing]).risk_level == "RED"
    assert classify([breathing, cough]).risk_level == "RED"


def test_duration_points_follow_requested_bands() -> None:
    cough = Match(medical_term="cough", matched_text="cough", language="en", category="respiratory", severity_weight=1)

    one_day = classify([cough], duration_days=1)
    three_days = classify([cough], duration_days=3)
    seven_days = classify([cough], duration_days=7)
    over_a_week = classify([cough], duration_days=8)

    assert [one_day.score, three_days.score, seven_days.score, over_a_week.score] == [2, 3, 4, 5]
    assert one_day.risk_level == "GREEN"
    assert three_days.risk_level == "YELLOW"


def test_missing_duration_uses_green_symptom_only_baseline() -> None:
    abdominal_pain = Match(
        medical_term="abdominal pain",
        matched_text="tiyan",
        language="tl",
        category="gastrointestinal",
        severity_weight=5,
    )
    breathing = Match(
        medical_term="difficulty breathing",
        matched_text="hingal",
        language="tl",
        category="respiratory",
        severity_weight=6,
    )

    assert classify([abdominal_pain]).risk_level == "GREEN"
    assert classify([abdominal_pain]).score == 5
    assert classify([breathing]).risk_level == "RED"
