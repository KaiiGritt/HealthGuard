"""Source-informed symptom smoke test; no database or server required.

Run from backend/: python run_engine_smoketest.py

The expected colors below are provisional product mappings of published care
directions, not colors prescribed by the cited sources or clinical approval.
"""
from __future__ import annotations

from dataclasses import dataclass
import sys

from app.nlp.engine import analyze
from app.nlp.lexicon import LexiconEntry
from app.seed import LEXICON_SEED

ENTRIES = [LexiconEntry(**entry) for entry in LEXICON_SEED]


@dataclass(frozen=True)
class SmokeCase:
    label: str
    input_text: str
    expected_level: str
    expected_terms: frozenset[str]
    source: str
    selected_symptoms: tuple[str, ...] = ()
    age: int | None = None


CASES = (
    SmokeCase(
        "Severe difficulty breathing",
        "I have severe difficulty breathing",
        "RED",
        frozenset({"difficulty breathing"}),
        "NHS urgent/emergency guidance; see literature review R2",
    ),
    SmokeCase(
        "Dengue warning sign: fever with severe abdominal pain",
        "I have suspected dengue, fever, and severe abdominal pain",
        "RED",
        frozenset({"fever", "abdominal pain"}),
        "CDC dengue warning signs; suspected/confirmed dengue only (R1)",
    ),
    SmokeCase(
        "Dengue warning sign: vomiting 3 times in one hour",
        "I have suspected dengue, fever, and vomiting 3 times in one hour",
        "RED",
        frozenset({"fever", "vomiting"}),
        "CDC dengue warning signs; suspected/confirmed dengue only (R1)",
    ),
    SmokeCase(
        "Dengue warning sign: vomiting 4 times in six hours",
        "I have suspected dengue, fever, and vomiting 4 times in 6 hours",
        "RED",
        frozenset({"fever", "vomiting"}),
        "CDC dengue warning signs; suspected/confirmed dengue only (R1)",
    ),
    SmokeCase(
        "Mucosal bleeding",
        "I have fever and bleeding gums",
        "RED",
        frozenset({"fever", "active bleeding"}),
        "CDC dengue warning signs (R1)",
    ),
    SmokeCase(
        "Altered mental status",
        "I have fever and feel confused",
        "RED",
        frozenset({"fever", "neurologic emergency"}),
        "CDC dengue warning signs; NHS emergency guidance (R1, R2)",
    ),
    SmokeCase(
        "Unable to keep fluids down",
        "I have vomiting and cannot keep fluids down",
        "YELLOW",
        frozenset({"vomiting"}),
        "NHS urgent advice; provisional local mapping to YELLOW (R3)",
        selected_symptoms=("vomiting",),
    ),
    SmokeCase(
        "Blood in stool",
        "I have diarrhea and blood in stool",
        "YELLOW",
        frozenset({"diarrhea", "blood in stool"}),
        "NHS urgent advice; provisional local mapping to YELLOW (R3)",
    ),
    SmokeCase(
        "Cough lasting four weeks",
        "I have had a cough for 4 weeks",
        "YELLOW",
        frozenset({"cough"}),
        "NHS recommends clinical review after 3 weeks; provisional YELLOW mapping (R4)",
    ),
    SmokeCase(
        "Cough with chest pain",
        "I have a cough and chest pain",
        "YELLOW",
        frozenset({"cough", "chest pain"}),
        "NHS urgent appointment advice; provisional YELLOW mapping (R2)",
    ),
    SmokeCase(
        "Child fever lasting five days",
        "My child has had a fever for 5 days",
        "YELLOW",
        frozenset({"fever"}),
        "NHS child-fever urgent advice; provisional YELLOW mapping (R5)",
        age=6,
    ),
    SmokeCase(
        "Diarrhea lasting eight days",
        "I have had diarrhea for 8 days",
        "YELLOW",
        frozenset({"diarrhea"}),
        "NHS urgent advice after 7 days; provisional YELLOW mapping (R3)",
    ),
)


def main() -> int:
    failures = 0
    print(f"Loaded {len(ENTRIES)} lexicon entries; running {len(CASES)} source-informed cases.\n")
    for case in CASES:
        result = analyze(
            case.input_text,
            list(case.selected_symptoms),
            ENTRIES,
            age=case.age,
        )
        detected = {match.medical_term for match in result.matches}
        level = result.classification.risk_level
        missing_terms = case.expected_terms - detected
        passed = level == case.expected_level and not missing_terms
        if not passed:
            failures += 1

        print(f"[{'PASS' if passed else 'FAIL'}] {case.label}")
        print(f"        expected={case.expected_level}; actual={level}; score={result.classification.score}")
        print(f"        detected={sorted(detected)}")
        if missing_terms:
            print(f"        missing terms={sorted(missing_terms)}")
        print(f"        source/rationale: {case.source}\n")

    print("=" * 72)
    if failures:
        print(
            f"{failures} of {len(CASES)} cases differ from the provisional "
            "source-informed expectations. Review HEALTHGUARD_TRIAGE_LITERATURE_REVIEW.md."
        )
    else:
        print(
            "All cases match the provisional source-informed expectations. "
            "This is not evidence of clinical validation."
        )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
