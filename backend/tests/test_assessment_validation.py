from app.nlp.lexicon import Match
from app.nlp.rules import classify, has_supported_symptom_input
from app.schemas import AnalyzeRequest


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
    assert has_supported_symptom_input("", ["fever"]) is True


def test_combination_rules_raise_urgency_for_common_clusters() -> None:
    fever = Match(medical_term="fever", matched_text="lagnat", language="tl", category="general", severity_weight=2)
    cough = Match(medical_term="cough", matched_text="ubo", language="tl", category="respiratory", severity_weight=1)
    breathing = Match(medical_term="difficulty breathing", matched_text="hirap huminga", language="tl", category="respiratory", severity_weight=4)
    chest = Match(medical_term="chest pain", matched_text="sakit sa dibdib", language="tl", category="cardio", severity_weight=4)

    yellow = classify([fever, cough])
    red = classify([breathing, chest])

    assert yellow.risk_level == "YELLOW"
    assert red.risk_level == "RED"


def test_any_red_flag_overrides_score_threshold() -> None:
    chest = Match(medical_term="chest pain", matched_text="chest pain", language="en", category="cardio", severity_weight=1)

    result = classify([chest])

    assert result.risk_level == "RED"
    assert result.triggered_rules[0].name == "critical:chest pain"


def test_duration_and_worsening_rules_raise_mild_symptoms() -> None:
    cough = Match(medical_term="cough", matched_text="cough", language="en", category="respiratory", severity_weight=1)

    result = classify([cough], input_text="My cough has lasted 31 days and is getting worse.")

    assert result.risk_level == "YELLOW"
    assert {rule.name for rule in result.triggered_rules} >= {"persistent-cough", "worsening-symptoms"}


def test_vital_sign_rules_escalate_at_explicit_thresholds() -> None:
    fever = Match(medical_term="fever", matched_text="fever", language="en", category="general", severity_weight=2)

    yellow = classify([fever], oxygen_saturation=92)
    red = classify([fever], oxygen_saturation=88)

    assert yellow.risk_level == "YELLOW"
    assert red.risk_level == "RED"


def test_weighted_score_and_symptom_count_rules() -> None:
    cough = Match(medical_term="cough", matched_text="cough", language="en", category="respiratory", severity_weight=1)
    headache = Match(medical_term="headache", matched_text="headache", language="en", category="neurological", severity_weight=1)
    fever = Match(medical_term="fever", matched_text="fever", language="en", category="general", severity_weight=2)
    breathing = Match(medical_term="difficulty breathing", matched_text="difficulty breathing", language="en", category="respiratory", severity_weight=6)

    assert classify([cough, headache]).risk_level == "GREEN"
    assert classify([fever, cough]).risk_level == "YELLOW"
    assert any(rule.name == "symptom-combination-score" for rule in classify([fever, cough]).triggered_rules)
    assert any(rule.name == "weighted-symptom-score" for rule in classify([fever, cough]).triggered_rules)
    assert classify([fever, cough, headache]).risk_level == "RED"
    assert classify([breathing]).risk_level == "YELLOW"
    assert classify([breathing, cough]).risk_level == "RED"
