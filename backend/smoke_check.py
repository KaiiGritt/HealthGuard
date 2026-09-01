import os
os.environ['PYTHONPATH'] = '.'

from app.nlp.rules import has_supported_symptom_input
from app.nlp.engine import analyze
from app.nlp.lexicon import LexiconEntry

assert has_supported_symptom_input("I don't have money", []) is False
assert has_supported_symptom_input("I have fever and cough", []) is True
assert has_supported_symptom_input("", ["fever"]) is True

entries = [
    LexiconEntry(local_term="fever", language="en", medical_term="fever", severity_weight=2, category="general"),
    LexiconEntry(local_term="cough", language="en", medical_term="cough", severity_weight=1, category="respiratory"),
    LexiconEntry(local_term="difficulty breathing", language="en", medical_term="difficulty breathing", severity_weight=4, category="respiratory"),
]
result = analyze("fever and cough", ["fever"], entries, age=70, sex="female")
assert result.classification.risk_level in {"GREEN", "YELLOW", "RED"}
assert result.classification.score >= 3
print("smoke-ok")
