"""Deterministic symptom extraction for multilingual resident descriptions.

This produces reviewable symptom signals only. Triage classification remains in
the separate rules pipeline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime

from .lexicon import LexiconEntry


@dataclass(frozen=True)
class _Candidate:
    start: int
    end: int
    canonical_term: str
    language: str
    source: str
    confidence: float


_BUILTIN_LEXICON = (
    ("sinisipon", "colds / rhinitis", "tl"),
    ("sipon", "colds / rhinitis", "tl"),
    ("sakit sa daghan", "chest pain", "bcl"),
    ("masakit an daghan", "chest pain", "bcl"),
    ("sakit sa dibdib", "chest pain", "tl"),
    ("paninikip ng dibdib", "chest tightness", "tl"),
    ("chest tightness", "chest tightness", "en"),
)

_INFLECTIONS = (
    ("nangangalay", "muscle ache / body soreness", "tl"),
    ("nanlalambot ang katawan", "generalized weakness", "tl"),
    ("hinihilo", "dizziness", "tl"),
    ("nahihilo", "dizziness", "tl"),
    ("nahilo", "dizziness", "tl"),
    ("dae na makahangos", "difficulty breathing", "bcl"),
    ("dai na makahangos", "difficulty breathing", "bcl"),
    ("hirap makahinga", "difficulty breathing", "tl"),
    ("nahihirapang huminga", "difficulty breathing", "tl"),
    ("hindi makahinga", "difficulty breathing", "tl"),
    ("sakit ng ulo", "headache", "tl"),
    ("may sakit ulo", "headache", "tl"),
    ("masakit ang ulo", "headache", "tl"),
    ("masakit ang tiyan", "abdominal pain", "tl"),
    ("masakit ang sikmura", "abdominal pain", "tl"),
    ("nagsusuka", "vomiting", "tl"),
    ("sumusuka", "vomiting", "tl"),
    ("umuubo", "cough", "tl"),
    ("nagtatae", "diarrhea", "tl"),
    ("nilalagnat", "fever", "tl"),
)

_NEGATION_RE = re.compile(
    r"\b(?:walang|wala|hindi|'di|di|dae|dai|mayong|no|not|don't|dont|doesn't|doesnt|do not|does not)(?:\s+[\w'-]+){0,2}\s*$",
    re.IGNORECASE,
)
_HEDGE_RE = re.compile(
    r"\b(?:parang(?:\s+may)?|medyo|baka|tila|siguro|mukhang)(?:\s+[\w'-]+){0,2}\s*$",
    re.IGNORECASE,
)
_ENGLISH_MARKERS = re.compile(r"\b(?:i|have|has|had|the|my|and|with|pain|feel|feeling)\b", re.I)
_TAGALOG_MARKERS = re.compile(r"\b(?:ako|ko|may|wala|walang|hindi|di|naman|ng|ang|sa|araw|lagnat|ubo|ulo|tiyan|sakit|nahihilo|sinisipon)\b", re.I)
_BICOL_MARKERS = re.compile(r"\b(?:dae|dai|mayong|aldaw|makahangos|daghan|siring)\b", re.I)

_NUMBER_WORDS = {
    "one": 1, "isa": 1, "sarong": 1,
    "two": 2, "dalawa": 2, "duwa": 2,
    "three": 3, "tatlo": 3, "tatlong": 3,
    "four": 4, "apat": 4,
    "five": 5, "lima": 5, "limang": 5,
    "six": 6, "anim": 6,
    "seven": 7, "pito": 7,
    "eight": 8, "walo": 8,
    "nine": 9, "siyam": 9,
    "ten": 10, "sampu": 10,
}
_NUMBER_PATTERN = "|".join(sorted(_NUMBER_WORDS, key=len, reverse=True))
_DURATION_RE = re.compile(
    rf"\b(?P<count>\d+(?:\.\d+)?|{_NUMBER_PATTERN})\s*(?P<unit>days?|araw|aldaw|weeks?|linggo|months?|buwan)(?:\s+na)?(?:\s+po)?\b",
    re.I,
)

_BODY_LOCATIONS = (
    (re.compile(r"\b(?:dibdib|daghan|chest)\b", re.I), "chest"),
    (re.compile(r"\b(?:tiyan|sikmura|abdomen|stomach|belly)\b", re.I), "abdomen"),
    (re.compile(r"\b(?:ulo|head)\b", re.I), "head"),
    (re.compile(r"\b(?:lalamunan|throat)\b", re.I), "throat"),
    (re.compile(r"\b(?:likod|back)\b", re.I), "back"),
)


def _phrase_pattern(phrase: str) -> re.Pattern[str]:
    words = re.split(r"\s+", phrase.strip())
    return re.compile(r"(?<!\w)" + r"\s+".join(map(re.escape, words)) + r"(?!\w)", re.I)


def _candidates(text: str, entries: list[LexiconEntry]) -> list[_Candidate]:
    found: list[_Candidate] = []
    for entry in entries:
        term = entry.local_term.strip()
        if not term or not entry.medical_term.strip():
            continue
        for match in _phrase_pattern(term).finditer(text):
            found.append(_Candidate(match.start(), match.end(), entry.medical_term.strip(), entry.language, "lexicon", 0.95))

    for phrase, canonical, language in _BUILTIN_LEXICON:
        for match in _phrase_pattern(phrase).finditer(text):
            found.append(_Candidate(match.start(), match.end(), canonical, language, "lexicon", 0.95))

    for phrase, canonical, language in _INFLECTIONS:
        for match in _phrase_pattern(phrase).finditer(text):
            found.append(_Candidate(match.start(), match.end(), canonical, language, "inferred", 0.86))

    # Limit typo handling to known speech-to-text variants; broad fuzzy matching
    # risks turning unrelated words into symptoms.
    for phrase, canonical in (("lagnad", "fever"), ("lagnaat", "fever")):
        for match in _phrase_pattern(phrase).finditer(text):
            found.append(_Candidate(match.start(), match.end(), canonical, "tl", "inferred", 0.82))

    found.sort(key=lambda item: (item.start, -(item.end - item.start), item.source != "lexicon"))
    selected: list[_Candidate] = []
    for candidate in found:
        overlaps = [item for item in selected if item.start < candidate.end and candidate.start < item.end]
        if overlaps:
            if all(item.canonical_term == candidate.canonical_term for item in overlaps):
                continue
            if any((item.end - item.start) >= (candidate.end - candidate.start) for item in overlaps):
                continue
            selected = [item for item in selected if item not in overlaps]
        selected.append(candidate)
    return sorted(selected, key=lambda item: item.start)


def _language(text: str) -> str:
    has_bicol = bool(_BICOL_MARKERS.search(text))
    has_tagalog = bool(_TAGALOG_MARKERS.search(text)) and not has_bicol
    has_english = bool(_ENGLISH_MARKERS.search(text))
    if has_bicol and has_english:
        return "mixed"
    if has_bicol:
        return "bcl"
    if has_tagalog and has_english:
        return "mixed"
    if has_tagalog:
        return "tl"
    return "en"


def _onset(text: str, message_timestamp: datetime | None) -> dict:
    match = _DURATION_RE.search(text)
    if match:
        count_text = match.group("count").lower()
        count = float(count_text) if count_text[0].isdigit() else float(_NUMBER_WORDS[count_text])
        unit = match.group("unit").lower()
        multiplier = 7 if unit.startswith(("week", "linggo")) else 30 if unit.startswith(("month", "buwan")) else 1
        return {
            "raw_phrase": match.group(0),
            "days_since_onset": count * multiplier,
            "approximate": unit.startswith(("month", "buwan")),
        }

    relative = (
        (r"\b(?:kaninang umaga|earlier today|this morning|today|ngayong araw)\b", 0, False),
        (r"\b(?:kahapon|yesterday)\b", 1, False),
        (r"\b(?:nitong linggo|this week)\b", 5, True),
        (r"\b(?:ilang araw na|a few days|several days)\b", None, True),
    )
    for pattern, days, approximate in relative:
        found = re.search(pattern, text, re.I)
        if found:
            return {"raw_phrase": found.group(0), "days_since_onset": days, "approximate": approximate}

    date_match = re.search(r"\b(?:since|mula noong)\s+(\d{4}-\d{2}-\d{2})\b", text, re.I)
    if date_match and message_timestamp is not None:
        try:
            onset_date = datetime.strptime(date_match.group(1), "%Y-%m-%d").date()
            return {
                "raw_phrase": date_match.group(0),
                "days_since_onset": max(0, (message_timestamp.date() - onset_date).days),
                "approximate": False,
            }
        except ValueError:
            pass
    return {"raw_phrase": None, "days_since_onset": None, "approximate": False}


def extract_symptoms(
    text: str,
    entries: list[LexiconEntry],
    message_timestamp: datetime | None = None,
) -> dict:
    """Extract symptom signals in the requested response shape, without triage."""
    detected: list[dict] = []
    negated: list[dict] = []
    unmapped: list[dict] = []
    seen_detected: set[str] = set()
    seen_negated: set[str] = set()

    for candidate in _candidates(text, entries):
        prefix_start = max(0, candidate.start - 48)
        prefix_text = text[prefix_start:candidate.start]
        separator = re.search(r"[,;.!?](?!.*[,;.!?])", prefix_text)
        segment_start = prefix_start + separator.end() if separator else prefix_start
        prefix = text[segment_start:candidate.start]
        negation = _NEGATION_RE.search(prefix)
        hedge = _HEDGE_RE.search(prefix)
        raw_start = segment_start + (negation.start() if negation else hedge.start()) if negation or hedge else candidate.start
        raw_phrase = text[raw_start:candidate.end].strip()
        canonical = candidate.canonical_term
        if negation:
            if canonical not in seen_negated:
                negated.append({"raw_phrase": raw_phrase, "canonical_term": canonical})
                seen_negated.add(canonical)
            continue
        if canonical in seen_detected:
            continue
        seen_detected.add(canonical)

        location = None
        context = text[max(0, candidate.start - 18):min(len(text), candidate.end + 18)]
        for pattern, value in _BODY_LOCATIONS:
            if pattern.search(context):
                location = value
                break
        confidence = min(candidate.confidence, 0.62) if hedge else candidate.confidence
        detected.append({
            "raw_phrase": raw_phrase,
            "canonical_term": canonical,
            "body_location": location,
            "source": candidate.source,
            "confidence": confidence,
            "hedged": bool(hedge),
        })
        if candidate.source == "inferred":
            unmapped.append({
                "raw_phrase": raw_phrase,
                "best_guess_term": canonical,
                "note": "Inferred from the phrase; add or confirm this mapping in the local symptom lexicon.",
            })

    def has_unnegated_match(pattern: str) -> bool:
        for found in re.finditer(pattern, text, re.I):
            prefix = text[max(0, found.start() - 48):found.start()]
            prefix = re.split(r"[,;.!?]", prefix)[-1]
            if not _NEGATION_RE.search(prefix):
                return True
        return False

    severity_modifiers = []
    for modifier in ("matindi", "grabe", "malala", "unbearable", "severe", "sobra", "matinding"):
        found = _phrase_pattern(modifier).search(text)
        if found and has_unnegated_match(_phrase_pattern(modifier).pattern):
            raw_modifier = found.group(0)
            if raw_modifier not in severity_modifiers:
                severity_modifiers.append(raw_modifier)

    red_flags = []
    detected_terms = {item["canonical_term"] for item in detected}
    for term in ("difficulty breathing", "chest pain", "chest tightness"):
        if term in detected_terms:
            red_flags.append(term)
    persistent_vomiting = r"\b(?:tuloy[- ]tuloy|persistent|hindi tumitigil|di tumitigil)\b.{0,28}\b(?:suka|nagsusuka|vomit|vomiting)\b|\b(?:suka|nagsusuka|vomit|vomiting)\b.{0,28}\b(?:tuloy[- ]tuloy|persistent|hindi tumitigil|di tumitigil)\b"
    if "vomiting" in detected_terms and has_unnegated_match(persistent_vomiting):
        red_flags.append("persistent vomiting")
    if "fever" in detected_terms and has_unnegated_match(r"\b(?:high fever|mataas na lagnat|sobrang taas ng lagnat)\b"):
        red_flags.append("high fever")
    if has_unnegated_match(r"\b(?:hindi makainom|di makainom|can't keep (?:water|fluids) down|cannot keep (?:water|fluids) down)\b"):
        red_flags.append("unable to keep fluids down")
    if has_unnegated_match(r"\b(?:sanggol|newborn|infant|baby)\b"):
        red_flags.append("infant mentioned")
    if has_unnegated_match(r"\b(?:matanda|elderly|senior citizen)\b"):
        red_flags.append("elderly person mentioned")

    folk_term_found = _phrase_pattern("pasma").search(text)
    if folk_term_found:
        unmapped.append({
            "raw_phrase": folk_term_found.group(0),
            "best_guess_term": "muscle strain (folk illness)",
            "note": "Folk-illness wording is not a confirmed symptom mapping; request human review.",
        })

    reviewer_note = ""
    if folk_term_found:
        reviewer_note = "Contains folk-illness wording 'pasma'; confirm its mapping before adding it to the lexicon."
    elif not detected and not negated:
        reviewer_note = "No symptom phrase could be extracted reliably from the supplied text."

    return {
        "language_detected": _language(text),
        "detected_symptoms": detected,
        "negated_symptoms": negated,
        "onset": _onset(text, message_timestamp),
        "severity_modifiers": severity_modifiers,
        "red_flags": list(dict.fromkeys(red_flags)),
        "unmapped_terms": unmapped,
        "reviewer_note": reviewer_note,
    }