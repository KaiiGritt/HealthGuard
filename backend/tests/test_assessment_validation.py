from app.nlp.lexicon import LexiconEntry, Match, match_text
from app.nlp.rules import classify, has_supported_symptom_input
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


def test_combination_rules_raise_urgency_for_common_clusters() -> None:
    fever = Match(medical_term="fever", matched_text="lagnat", language="tl", category="general", severity_weight=2)
    cough = Match(medical_term="cough", matched_text="ubo", language="tl", category="respiratory", severity_weight=1)
    breathing = Match(medical_term="difficulty breathing", matched_text="hirap huminga", language="tl", category="respiratory", severity_weight=4)
    yellow = classify([fever, cough])
    red = classify([breathing, fever])

    assert yellow.risk_level == "YELLOW"
    assert red.risk_level == "RED"


def test_unsupported_red_flag_is_not_classified_as_a_supported_symptom() -> None:
    assert has_supported_symptom_input("I have chest pain", []) is False
    assert has_supported_symptom_input("I have bloody stool", []) is False


def test_canonical_lexicon_contains_only_selectable_symptoms() -> None:
    assert {entry["medical_term"] for entry in LEXICON_SEED} == set(SELECTABLE_SYMPTOMS)


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
