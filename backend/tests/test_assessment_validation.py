from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.nlp.lexicon import LexiconEntry, Match, match_text
from app.nlp.engine import analyze
from app.nlp.rules import build_premedication_guide, classify, emergency_terms_from_text, has_supported_symptom_input
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
        pregnancy_status="yes",
    )

    assert payload.age == 30
    assert payload.sex == "female"
    assert payload.pregnancy_status == "yes"


def test_confirmed_pregnancy_with_fever_requires_health_worker_review() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("fever", ["fever"], entries, pregnancy_status="yes")

    assert result.classification.risk_level == "YELLOW"
    assert "pregnancy-fever-review" in {
        rule.name for rule in result.classification.triggered_rules
    }


@pytest.mark.parametrize("text", ["ano ang gamot sa ubo?", "ano ang lagnat?", "hindi ko alam kung may lagnat ako"])
def test_questions_and_uncertainty_do_not_become_symptom_assessments(text: str) -> None:
    with pytest.raises(HTTPException) as error:
        analyze_symptoms(AnalyzeRequest(input_text=text), None, None)

    assert error.value.status_code == 422


def test_explicit_child_age_in_text_controls_triage_and_loperamide_gate() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry) for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(
        AnalyzeRequest(input_text="anak ko 2 taong gulang, nagtatae", age=30),
        db,
        None,
    )

    assert result.pre_medication is not None
    assert result.pre_medication.medication_name == "Oral Rehydration Solution (ORS)"


@pytest.mark.parametrize("selected_term", ["neurologic emergency", "altered consciousness"])
def test_child_danger_sign_selections_return_red(selected_term: str) -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry) for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(
        AnalyzeRequest(
            input_text="Assessment for a child aged 3.",
            selected_symptoms=[selected_term],
            method="select",
            age=3,
        ),
        db,
        None,
    )

    assert result.risk_level == "RED"
    assert {symptom.medical_term for symptom in result.detected_symptoms} == {selected_term}


def test_infant_months_in_text_are_age_not_duration() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry) for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(
        AnalyzeRequest(input_text="baby ko 3 buwan, may lagnat", age=30),
        db,
        None,
    )

    assert result.risk_level == "RED"
    assert "duration-score" not in {rule.name for rule in result.triggered_rules}


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
    short_breathing_phrases = [
        analyze(phrase, [], entries)
        for phrase in ("dae makahangos", "dae nakahangos")
    ]

    assert {match.medical_term for match in fever.matches} == {"fever"}
    assert {match.medical_term for match in breathing.matches} == {"difficulty breathing"}
    assert all(
        {match.medical_term for match in result.matches} == {"difficulty breathing"}
        and result.classification.risk_level == "RED"
        for result in short_breathing_phrases
    )


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


@pytest.mark.parametrize(
    "text, expected",
    [
        ("nagsusuka ng dugo", "blood in vomit"),
        ("fever with stiff neck and severe headache", "neurologic emergency"),
        ("lagnat 3 araw, may pasa at dumudugo ang gilagid", "active bleeding"),
        ("itim ang dumi ko at masakit ang tiyan", "black stool"),
        ("nagkaroon ng seizure at may lagnat", "neurologic emergency"),
        ("sumasakit ang dibdib ko", "chest pain"),
        ("pinakamasakit na sakit ng ulo, biglaan", "thunderclap headache"),
        ("Thunderclap headache", "thunderclap headache"),
        ("yellow-green vomit", "green vomit"),
        ("nagsuka ng berdeng suka", "green vomit"),
    ],
)
def test_emergency_text_overrides_normal_symptom_extraction(text: str, expected: str) -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze(text, [], entries)

    assert expected in emergency_terms_from_text(text)
    assert result.classification.risk_level == "RED"


def test_negated_green_vomit_does_not_trigger_emergency() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("no green vomit, vomited once", ["vomiting"], entries, age=36)

    assert "green vomit" not in emergency_terms_from_text("no green vomit, vomited once")
    assert result.classification.risk_level != "RED"


@pytest.mark.parametrize(
    "text, selected, age, expected_rule",
    [
        ("no wet diaper for 3 hours", ["diarrhea"], 2, "dehydration-risk-review"),
        ("dark urine and urinating less than usual", ["diarrhea"], 36, "dehydration-risk-review"),
        ("cannot keep fluids down", ["diarrhea", "vomiting"], 36, "cannot-retain-fluids-review"),
        ("6 loose stools today, no fever or blood", ["diarrhea"], 36, "high-stool-frequency-review"),
    ],
)
def test_gastrointestinal_risk_cues_trigger_review_floor(
    text: str,
    selected: list[str],
    age: int,
    expected_rule: str,
) -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze(text, selected, entries, age=age)

    assert result.classification.risk_level == "YELLOW"
    assert expected_rule in {rule.name for rule in result.classification.triggered_rules}


def test_negated_gastrointestinal_risk_cues_do_not_add_review_rules() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze(
        "no dehydration, no dark urine, can keep fluids down, fewer than 6 loose stools today",
        ["diarrhea"],
        entries,
        age=36,
    )

    rule_names = {rule.name for rule in result.classification.triggered_rules}
    assert not rule_names & {
        "dehydration-risk-review",
        "cannot-retain-fluids-review",
        "high-stool-frequency-review",
    }


def test_cough_triggered_headache_requires_non_emergency_clinical_review() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("new headache triggered by coughing", ["headache"], entries)

    assert result.classification.risk_level == "YELLOW"
    assert "headache-triggered-by-activity-review" in {
        rule.name for rule in result.classification.triggered_rules
    }
    assert "moderate-severity-score" not in {
        rule.name for rule in result.classification.triggered_rules
    }


def test_negated_cough_trigger_does_not_raise_headache_review_floor() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("headache not triggered by coughing", ["headache"], entries)

    assert result.classification.risk_level == "GREEN"
    assert "headache-triggered-by-activity-review" not in {
        rule.name for rule in result.classification.triggered_rules
    }


def test_first_cluster_like_episode_requires_clinician_review_not_red() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    first_episode = analyze(
        "first-ever bout of severe one-sided pain around one eye; selected symptom type: cluster headache",
        ["headache"],
        entries,
    )
    no_first_episode = analyze("selected symptom type: cluster headache", ["headache"], entries)

    assert first_episode.classification.risk_level == "YELLOW"
    assert "first-cluster-like-headache-review" in {
        rule.name for rule in first_episode.classification.triggered_rules
    }
    assert "moderate-severity-score" not in {
        rule.name for rule in first_episode.classification.triggered_rules
    }
    assert no_first_episode.classification.risk_level == "GREEN"
    assert "first-cluster-like-headache-review" not in {
        rule.name for rule in no_first_episode.classification.triggered_rules
    }


def test_negated_blood_in_stool_does_not_trigger_black_stool_red_flag() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("walang dugo sa dumi ko, nagtatae ako", [], entries)

    assert "black stool" not in emergency_terms_from_text("walang dugo sa dumi ko, nagtatae ako")
    assert {match.medical_term for match in result.matches} == {"diarrhea"}
    assert result.classification.risk_level != "RED"


def test_three_day_cough_without_fever_stays_green() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    english_result = analyze("no fever but cough for 3 days", [], entries)
    tagalog_result = analyze("ubo 3 araw lang, walang lagnat", [], entries)

    for result in (english_result, tagalog_result):
        assert {match.medical_term for match in result.matches} == {"cough"}
        assert result.classification.risk_level == "GREEN"


def test_tagalog_unable_to_drink_text_is_red() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("di makainom anak ko", [], entries)

    assert {match.medical_term for match in result.matches} == {"unable to drink"}
    assert result.classification.risk_level == "RED"


def test_weekday_onset_does_not_silently_drop_fever_to_green() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("lagnat mula pa noong Lunes", [], entries)

    assert "fever" in {match.medical_term for match in result.matches}
    assert result.classification.risk_level == "YELLOW"
    assert "relative-onset-needs-review" in {
        rule.name for rule in result.classification.triggered_rules
    }


def test_child_vomiting_danger_sign_is_distinct_from_ordinary_vomiting() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    ordinary_vomiting = analyze("vomiting", ["vomiting"], entries, age=3)
    danger_sign = analyze("vomits everything", ["vomits everything"], entries, age=3)

    assert ordinary_vomiting.classification.risk_level == "GREEN"
    assert danger_sign.classification.risk_level == "RED"
    assert {match.medical_term for match in danger_sign.matches} == {"vomits everything"}


def test_reported_common_typos_match_symptoms() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    fever_cough = analyze("fevr and coff for 2 days", [], entries)
    abdominal_vomiting = analyze("masakit ang tyan ko at nagsusuka", [], entries)

    assert {match.medical_term for match in fever_cough.matches} == {"fever", "cough"}
    assert {match.medical_term for match in abdominal_vomiting.matches} == {"abdominal pain", "vomiting"}


def test_five_day_fever_and_infant_fever_are_red() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    assert analyze("lagnat 5 araw na hindi bumababa", [], entries).classification.risk_level == "RED"
    assert analyze("fever", ["fever"], entries, age=0).classification.risk_level == "RED"


def test_fever_in_infant_up_to_two_months_has_explicit_hospital_rule() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("Assessment for a person aged 2 months.", ["fever"], entries, age=0, age_months=2)

    assert result.classification.risk_level == "RED"
    assert "young-infant-fever-referral" in {
        rule.name for rule in result.classification.triggered_rules
    }
    assert "duration-score" not in {
        rule.name for rule in result.classification.triggered_rules
    }


def test_older_adult_fever_and_matamlay_are_red() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    result = analyze("lola ko 78, lagnat at ubo, matamlay", [], entries, age=78)
    below_age_threshold = analyze("fever and matamlay", [], entries, age=65)

    assert {match.medical_term for match in result.matches} == {
        "fever",
        "cough",
        "generalized weakness",
    }
    assert result.classification.risk_level == "RED"
    assert "older-adult-fever-weakness-override" in {
        rule.name for rule in result.classification.triggered_rules
    }
    assert below_age_threshold.classification.risk_level == "YELLOW"
    assert build_premedication_guide(
        result.classification.risk_level,
        [match.medical_term for match in result.matches],
        age=78,
    ) is None


def test_pregnancy_weeks_are_not_symptom_duration() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    result = analyze("buntis ako 30 weeks, sumasakit ulo at nanlalabo paningin", [], entries)

    assert result.classification.risk_level == "RED"
    assert "210" not in result.classification.reason


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


def test_chest_pain_and_blood_in_stool_are_supported() -> None:
    assert has_supported_symptom_input("I have chest pain", []) is True
    assert has_supported_symptom_input("I have blood in stool", []) is True
    assert has_supported_symptom_input("dugo sa dumi ko", []) is True


def test_blood_in_stool_chip_requires_review_and_blocks_loperamide() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]

    blood_only = analyze("", ["blood in stool"], entries)
    bloody_diarrhea = analyze("", ["blood in stool", "diarrhea"], entries)
    guide = build_premedication_guide(
        bloody_diarrhea.classification.risk_level,
        [match.medical_term for match in bloody_diarrhea.matches],
    )

    assert blood_only.classification.risk_level == "YELLOW"
    assert bloody_diarrhea.classification.risk_level == "YELLOW"
    assert guide is not None
    assert guide.medication_name == "Oral Rehydration Solution (ORS)"


def test_additional_chip_canonicals_resolve_in_the_engine() -> None:
    entries = [LexiconEntry(**entry) for entry in LEXICON_SEED]
    terms = {
        "blood in stool",
        "chest pain",
        "muscle ache / body soreness",
        "dizziness",
        "generalized weakness",
    }

    for term in terms:
        result = analyze("", [term], entries)
        assert term in {match.medical_term for match in result.matches}


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
        "blood in stool",
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


def test_assessment_endpoint_accepts_kwf_documented_sorsoganon_fever_term() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry, review_status="approved") for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(AnalyzeRequest(input_text="kalintura"), db, None)

    assert result.detected_symptoms[0].medical_term == "fever"
    assert result.detected_symptoms[0].matched_text == "kalintura"


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

    assert [one_day.score, three_days.score, seven_days.score, over_a_week.score] == [2, 2, 4, 5]
    assert one_day.risk_level == "GREEN"
    assert three_days.risk_level == "GREEN"
    assert seven_days.risk_level == "YELLOW"


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
