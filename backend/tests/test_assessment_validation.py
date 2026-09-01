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
