"""Biomedical entity extraction via the configured scispaCy model.

Use Python 3.11 or 3.12 with spaCy, scispaCy, and the `en_core_sci_sm` model installed.
`extract_entities()` returns biomedical entity spans recognized by the model. The
recognized spans are only useful to triage when they match an existing symptom lexicon
entry; scispaCy does not itself assign urgency or recommendations.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from .tokenizer import normalize

_MODEL_NAME = "en_core_sci_sm"


@dataclass(frozen=True)
class BiomedicalEntity:
    text: str
    lemma: str
    start_char: int


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
    """Return each term's first recognized entity, or itself if none is recognized."""
    nlp = _load_nlp()
    if nlp is None:
        return {t: t for t in terms}
    result: dict[str, str] = {}
    for term in terms:
        doc = nlp(term)
        ents = [e.text for e in doc.ents]
        result[term] = ents[0].lower() if ents else term
    return result


def extract_entities(text: str) -> list[BiomedicalEntity]:
    """Return recognized English biomedical spans with their model lemmas and offsets."""
    if not text.strip():
        return []
    nlp = _load_nlp()
    if nlp is None:
        return []
    entities: list[BiomedicalEntity] = []
    for entity in nlp(text).ents:
        surface = normalize(entity.text)
        if not surface:
            continue
        lemma = normalize(" ".join(token.lemma_ or token.text for token in entity))
        entities.append(
            BiomedicalEntity(
                text=surface,
                lemma=lemma or surface,
                start_char=entity.start_char,
            )
        )
    return entities
