"""Optional Layer-1 biomedical normalization (SPECIALIST lexicon via scispaCy).

scispaCy has no wheels for Python 3.14, so this adapter is dormant by default. On a
Python 3.11/3.12 venv with spaCy + scispaCy installed, `is_available()` returns True
and `normalize_terms()` maps detected terms to canonical biomedical entities. The rest
of the pipeline works identically whether or not this layer is active.
"""
from __future__ import annotations

from functools import lru_cache

_MODEL_NAME = "en_core_sci_sm"


@lru_cache(maxsize=1)
def _load_nlp():
    try:
        import spacy  # type: ignore

        return spacy.load(_MODEL_NAME)
    except Exception:
        return None


def is_available() -> bool:
    """True only if spaCy + the scispaCy model are importable/loadable."""
    return _load_nlp() is not None


def normalize_terms(terms: list[str]) -> dict[str, str]:
    """Map each term to a normalized biomedical form. Identity map if layer is dormant."""
    nlp = _load_nlp()
    if nlp is None:
        return {t: t for t in terms}
    result: dict[str, str] = {}
    for term in terms:
        doc = nlp(term)
        ents = [e.text for e in doc.ents]
        result[term] = ents[0].lower() if ents else term
    return result
