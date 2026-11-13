"""Generate non-authoritative Tagalog symptom candidates for human review."""
from __future__ import annotations

import re
from functools import lru_cache

from tglstemmer import stemmer

from .lexicon import LexiconEntry

_WORD_PATTERN = re.compile(r"[a-zñ]+", re.IGNORECASE)
_STOP_WORDS = {
    "akin",
    "aking",
    "ako",
    "ang",
    "at",
    "ko",
    "may",
    "na",
    "ng",
    "ni",
    "po",
    "sa",
    "si",
    "yung",
}


@lru_cache(maxsize=2048)
def _stem(token: str) -> str:
    return str(stemmer.get_stem(token)).lower()


def _content_stems(text: str) -> tuple[str, ...]:
    stems = []
    for token in _WORD_PATTERN.findall(text.lower()):
        if token in _STOP_WORDS:
            continue
        root = _stem(token)
        if root and root not in _STOP_WORDS:
            stems.append(root)
    return tuple(stems)


def suggest_tagalog_symptoms(
    text: str,
    entries: list[LexiconEntry],
    matched_terms: set[str],
) -> list[dict[str, str]]:
    """Return stemmed phrase candidates without adding them to triage matches."""
    input_stems = _content_stems(text)
    if not input_stems:
        return []

    suggestions: dict[str, dict[str, str]] = {}
    for entry in entries:
        if entry.language.lower() != "tl" or entry.medical_term in matched_terms:
            continue

        phrase_stems = _content_stems(entry.local_term)
        if len(phrase_stems) < 2:
            continue
        phrase_length = len(phrase_stems)
        if not any(
            input_stems[index:index + phrase_length] == phrase_stems
            for index in range(len(input_stems) - phrase_length + 1)
        ):
            continue

        suggestions.setdefault(
            entry.medical_term,
            {
                "medical_term": entry.medical_term,
                "matched_lexicon_term": entry.local_term,
            },
        )
    return list(suggestions.values())
