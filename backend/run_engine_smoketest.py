"""Standalone engine smoke-test — no database or server required.

Run:  python run_engine_smoketest.py   (from the backend/ directory)

Exercises the NLP + rule pipeline against the seed lexicon and asserts the expected
Green/Yellow/Red outcomes for representative English and Tagalog inputs.
"""
from __future__ import annotations

import sys

from app.nlp.engine import analyze
from app.nlp.lexicon import LexiconEntry
from app.seed import LEXICON_SEED

ENTRIES = [LexiconEntry(**e) for e in LEXICON_SEED]

CASES = [
    # (label, input_text, selected, expected_level, expected_terms_subset)
    ("EN fever+breathing", "I have fever and difficulty breathing", [], "RED",
     {"fever", "difficulty breathing"}),
    ("TL lagnat+hirap huminga", "May lagnat ako at hirap huminga", [], "RED",
     {"fever", "difficulty breathing"}),
    ("Chips: headache only", "", ["headache"], "GREEN", {"headache"}),
    ("TL fever+vomiting", "May lagnat at pagsusuka", [], "YELLOW", {"fever", "vomiting"}),
    ("Nonsense input", "hello world", [], "GREEN", set()),
]


def main() -> int:
    failures = 0
    print(f"Loaded {len(ENTRIES)} lexicon entries.\n")
    for label, text, selected, exp_level, exp_terms in CASES:
        r = analyze(text, selected, ENTRIES)
        got_terms = {m.medical_term for m in r.matches}
        level = r.classification.risk_level
        ok = level == exp_level and exp_terms.issubset(got_terms)
        status = "PASS" if ok else "FAIL"
        if not ok:
            failures += 1
        print(f"[{status}] {label}")
        print(f"        input: {text!r} selected={selected}")
        print(f"        -> level={level} (expected {exp_level}) "
              f"score={r.classification.score}")
        print(f"        -> detected={sorted(got_terms)} (expected superset of {sorted(exp_terms)})")
        print(f"        -> reason: {r.classification.reason}")
        print(f"        -> recommendation: {r.classification.recommendation}\n")

    print("=" * 60)
    if failures:
        print(f"{failures} case(s) FAILED.")
    else:
        print("All cases PASSED.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
