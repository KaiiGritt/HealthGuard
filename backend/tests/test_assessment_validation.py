from app.nlp.rules import has_supported_symptom_input
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
    assert has_supported_symptom_input("", ["fever"]) is True
