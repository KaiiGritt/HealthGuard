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


# Common Tagalog inflections reduced to the short symptom word shown to the
# matching and explanation layers. The medical_term remains the canonical
# English category used by triage and reporting.
TAGALOG_ROOTS = {
    "inuubo": "ubo",
    "ubo nang ubo": "ubo",
    "nag susuka": "suka",
    "nilalagnat": "lagnat",
    "mataas ang temperatura": "lagnat",
    "may init": "lagnat",
    "masakit ang ulo": "ulo",
    "sumasakit ang ulo": "ulo",
    "kumikirot ang ulo": "ulo",
    "mabigat ang ulo": "ulo",
    "kirot sa ulo": "ulo",
    "masakit ang tiyan": "tiyan",
    "masakit ang sikmura": "tiyan",
    "kumikirot ang tiyan": "tiyan",
    "kirot sa tiyan": "tiyan",
    "kumukulo ang tiyan": "tiyan",
    "nasusuka": "suka",
    "sumusuka": "suka",
    "nagsusuka": "suka",
    "isinusuka": "suka",
    "pagkahilo at pagsusuka": "suka",
    "nagtatae": "tae",
    "tubig ang dumi": "tae",
    "madalas dumumi": "tae",
    "hinihingal": "hingal",
    "hirap sa paghinga": "hingal",
    "bumibilis ang paghinga": "hingal",
    "umuubo": "ubo",
    "paubo-ubo": "ubo",
}

ROOT_BY_MEDICAL_TERM = {
    "fever": "lagnat",
    "cough": "ubo",
    "headache": "ulo",
    "abdominal pain": "tiyan",
    "vomiting": "suka",
    "diarrhea": "tae",
    "difficulty breathing": "hingal",
}

MEDICAL_TERM_BY_ROOT = {root: term for term, root in ROOT_BY_MEDICAL_TERM.items()}


def extract_tagalog_root(term: str, medical_term: str = "", language: str = "tl") -> str:
    """Return one stable root word for every recognized Tagalog symptom term."""
    normalized = normalize(term)
    if language.lower() == "tl" and medical_term in ROOT_BY_MEDICAL_TERM:
        return ROOT_BY_MEDICAL_TERM[medical_term]
    return TAGALOG_ROOTS.get(normalized, normalized)


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
            matched_text=extract_tagalog_root(entry.local_term, entry.medical_term, entry.language),
            language=entry.language,
            category=entry.category,
            severity_weight=entry.severity_weight,
        )
        current = best.get(entry.medical_term)
        if current is None or candidate.severity_weight > current.severity_weight:
            best[entry.medical_term] = candidate

    # Keep recognition working when the database has not yet received a newly
    # added alias. Resolve known Tagalog roots against the canonical entry.
    canonical_entries = {
        entry.medical_term: entry
        for entry in entries
        if entry.language.lower() == "en"
    }
    for surface, root in TAGALOG_ROOTS.items():
        if surface not in normalized:
            continue
        medical_term = MEDICAL_TERM_BY_ROOT.get(root)
        entry = canonical_entries.get(medical_term)
        if entry is None or medical_term in best:
            continue
        best[medical_term] = Match(
            medical_term=medical_term,
            matched_text=root,
            language="tl",
            category=entry.category,
            severity_weight=entry.severity_weight,
        )

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
