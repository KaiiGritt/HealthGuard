"""Match SPECIALIST spelling variants for existing canonical symptom terms."""
from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from ..config import settings
from .lexicon import LexiconEntry, Match
from .tokenizer import normalize

_BASE_PATTERN = re.compile(r"^\{base=(.*)$")
_SPELLING_VARIANT_PATTERN = re.compile(r"^\s*spelling_variant=(.*)$")


@dataclass(frozen=True)
class SpecialistMatch:
    match: Match
    start_char: int


@lru_cache(maxsize=4)
def _load_mappings(
    path: str,
    canonical_terms: tuple[str, ...],
) -> tuple[tuple[str, str], ...]:
    lexicon_path = Path(path)
    if not lexicon_path.is_file():
        raise FileNotFoundError(f"SPECIALIST Lexicon file was not found: {lexicon_path}")

    canonical_term_set = set(canonical_terms)
    mappings: dict[str, str] = {}
    ambiguous_variants: set[str] = set()
    base: str | None = None
    spelling_variants: list[str] = []

    def add_record() -> None:
        if base is None:
            return
        medical_term = normalize(base)
        if medical_term not in canonical_term_set:
            return
        for value in (base, *spelling_variants):
            variant = normalize(value)
            if not variant or variant in ambiguous_variants:
                continue
            previous_term = mappings.get(variant)
            if previous_term is not None and previous_term != medical_term:
                mappings.pop(variant)
                ambiguous_variants.add(variant)
            else:
                mappings[variant] = medical_term

    with lexicon_path.open("r", encoding="utf-8", errors="strict") as lexicon_file:
        for line_number, line in enumerate(lexicon_file, start=1):
            record_start = _BASE_PATTERN.match(line.rstrip("\r\n"))
            if record_start is not None:
                add_record()
                base = record_start.group(1).strip()
                if not base:
                    raise ValueError(f"SPECIALIST Lexicon has an empty base at line {line_number}.")
                spelling_variants = []
                continue

            variant_match = _SPELLING_VARIANT_PATTERN.match(line.rstrip("\r\n"))
            if variant_match is not None:
                variant = variant_match.group(1).strip()
                if not variant:
                    raise ValueError(
                        f"SPECIALIST Lexicon has an empty spelling variant at line {line_number}."
                    )
                spelling_variants.append(variant)
            elif line.strip() == "}":
                add_record()
                base = None
                spelling_variants = []

    add_record()
    return tuple(sorted(mappings.items(), key=lambda item: (-len(item[0]), item[0])))


def _configured_mappings() -> str:
    path = settings.specialist_lexicon_path
    if path is None:
        return ""
    return str(Path(path).expanduser().resolve())


def is_available() -> bool:
    """Return whether a non-empty local SPECIALIST Lexicon file is configured."""
    path = _configured_mappings()
    if not path:
        return False
    lexicon_path = Path(path)
    if not lexicon_path.is_file():
        raise FileNotFoundError(f"SPECIALIST Lexicon file was not found: {lexicon_path}")
    with lexicon_path.open("r", encoding="utf-8", errors="strict") as lexicon_file:
        return lexicon_file.readline().startswith("{base=")


def find_matches(text: str, entries: list[LexiconEntry]) -> list[SpecialistMatch]:
    """Resolve reviewed lexical variants only to existing canonical symptoms."""
    normalized_text = normalize(text)
    if not normalized_text:
        return []

    canonical_entries: dict[str, LexiconEntry] = {}
    for entry in entries:
        if entry.medical_term not in canonical_entries or entry.language.lower() == "en":
            canonical_entries[entry.medical_term] = entry

    found: list[SpecialistMatch] = []
    seen_terms: set[str] = set()
    path = _configured_mappings()
    if not path:
        return []

    mappings = _load_mappings(path, tuple(sorted(canonical_entries)))
    for variant, medical_term in mappings:
        entry = canonical_entries.get(medical_term)
        if entry is None or medical_term in seen_terms:
            continue
        pattern = re.compile(r"(?<!\w)" + re.escape(variant) + r"(?!\w)")
        match = pattern.search(normalized_text)
        if match is None:
            continue
        seen_terms.add(medical_term)
        found.append(
            SpecialistMatch(
                match=Match(
                    medical_term=entry.medical_term,
                    matched_text=variant,
                    language="en",
                    category=entry.category,
                    severity_weight=entry.severity_weight,
                ),
                start_char=match.start(),
            )
        )
    return found
