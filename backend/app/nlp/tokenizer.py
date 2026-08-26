"""Text tokenization/normalization using NLTK.

Falls back to a regex tokenizer if the NLTK 'punkt' model is unavailable, so the
engine never hard-fails on a missing download.
"""
from __future__ import annotations

import re

_WORD_RE = re.compile(r"[a-zA-Zñ]+", re.UNICODE)


def normalize(text: str) -> str:
    """Lowercase and collapse whitespace."""
    return re.sub(r"\s+", " ", text.strip().lower())


def tokenize(text: str) -> list[str]:
    """Return a list of lowercase word tokens."""
    normalized = normalize(text)
    if not normalized:
        return []
    try:
        import nltk

        return [t for t in nltk.word_tokenize(normalized) if _WORD_RE.fullmatch(t)]
    except Exception:
        # NLTK data missing or import failed — regex fallback keeps the engine working.
        return _WORD_RE.findall(normalized)
