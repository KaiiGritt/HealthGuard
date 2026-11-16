"""Match Tagalog inflections to existing symptom phrases using TglStemmer."""
from __future__ import annotations

import re
from functools import lru_cache

from tglstemmer import stemmer

from .extractor import is_negated_prefix
from .lexicon import LexiconEntry, Match

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


def _content_tokens(text: str) -> list[tuple[str, int, int]]:
    tokens = []
    for match in _WORD_PATTERN.finditer(text):
        token = match.group(0).lower()
        if token in _STOP_WORDS:
            continue
        root = _stem(token)
        if root and root not in _STOP_WORDS:
            tokens.append((root, match.start(), match.end()))
    return tokens


def _content_stems(text: str) -> tuple[str, ...]:
    return tuple(root for root, _, _ in _content_tokens(text))


def match_tagalog_stemmed_symptoms(
    text: str,
    entries: list[LexiconEntry],
) -> list[Match]:
    """Match contiguous stemmed phrases from the existing Tagalog lexicon."""
    input_tokens = _content_tokens(text)
    if not input_tokens:
        return []

    best: dict[str, Match] = {}
    input_stems = tuple(root for root, _, _ in input_tokens)
    for entry in entries:
        if entry.language.lower() != "tl":
            continue
        phrase_stems = _content_stems(entry.local_term)
        phrase_length = len(phrase_stems)
        if phrase_length < 2:
            continue

        for index in range(len(input_stems) - phrase_length + 1):
            if input_stems[index:index + phrase_length] != phrase_stems:
                continue
            _, start, _ = input_tokens[index]
            end = input_tokens[index + phrase_length - 1][2]
            if re.search(r"[,;.!?\r\n]", text[start:end]):
                continue
            if is_negated_prefix(text[:start]):
                continue

            candidate = Match(
                medical_term=entry.medical_term,
                matched_text=text[start:end],
                language="tl",
                category=entry.category,
                severity_weight=entry.severity_weight,
            )
            current = best.get(entry.medical_term)
            if current is None or candidate.severity_weight > current.severity_weight:
                best[entry.medical_term] = candidate
            break
    return list(best.values())


def suggest_tagalog_symptoms(
    text: str,
    entries: list[LexiconEntry],
    matched_terms: set[str],
) -> list[dict[str, str]]:
    """Return unmatched stemmed phrase candidates for human review."""
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
