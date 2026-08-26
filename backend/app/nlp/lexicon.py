"""Match user text against the bilingual lexicon.

Matching strategy:
  1. Multi-word phrases first (e.g. "hirap huminga", "difficulty breathing") via substring
     match on the normalized text — so a phrase isn't missed when split into tokens.
  2. Single-word terms via token membership.
Each standard medical_term is reported at most once, keeping the highest-severity match.
"""
from __future__ import annotations

from dataclasses import dataclass

from .tokenizer import normalize, tokenize


@dataclass(frozen=True)
class LexiconEntry:
    local_term: str
    language: str
    medical_term: str
    severity_weight: int
    category: str


@dataclass(frozen=True)
class Match:
    medical_term: str
    matched_text: str
    language: str
    category: str
    severity_weight: int


def match_text(text: str, entries: list[LexiconEntry]) -> list[Match]:
    """Return de-duplicated symptom matches found in `text`."""
    normalized = normalize(text)
    tokens = set(tokenize(text))
    best: dict[str, Match] = {}

    for entry in entries:
        term = normalize(entry.local_term)
        is_phrase = " " in term
        found = (term in normalized) if is_phrase else (term in tokens)
        if not found:
            continue
        candidate = Match(
            medical_term=entry.medical_term,
            matched_text=entry.local_term,
            language=entry.language,
            category=entry.category,
            severity_weight=entry.severity_weight,
        )
        current = best.get(entry.medical_term)
        if current is None or candidate.severity_weight > current.severity_weight:
            best[entry.medical_term] = candidate

    return list(best.values())


def match_selected(selected: list[str], entries: list[LexiconEntry]) -> list[Match]:
    """Resolve chip selections (standard medical terms) to Match objects."""
    by_term: dict[str, LexiconEntry] = {}
    for entry in entries:
        # Prefer the English canonical entry for weight/category lookup.
        if entry.medical_term not in by_term or entry.language == "en":
            by_term[entry.medical_term] = entry

    matches: list[Match] = []
    for sel in selected:
        key = normalize(sel)
        entry = by_term.get(key)
        if entry is None:
            continue
        matches.append(
            Match(
                medical_term=entry.medical_term,
                matched_text=entry.medical_term,
                language=entry.language,
                category=entry.category,
                severity_weight=entry.severity_weight,
            )
        )
    return matches
