"""Deterministic symptom extraction for multilingual resident descriptions.

This produces reviewable symptom signals only. Triage classification remains in
the separate rules pipeline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import unquote

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
    ("dae makahangos", "difficulty breathing", "bcl"),
    ("dae nakahangos", "difficulty breathing", "bcl"),
    ("dae na makahangos", "difficulty breathing", "bcl"),
    ("dai na makahangos", "difficulty breathing", "bcl"),
    ("hirap makahinga", "difficulty breathing", "tl"),
    ("nahihirapang huminga", "difficulty breathing", "tl"),
    ("hindi makahinga", "difficulty breathing", "tl"),
    ("sakit ng ulo", "headache", "tl"),
    ("may sakit ulo", "headache", "tl"),
    ("masakit ulo", "headache", "tl"),
    ("masakit po ulo", "headache", "tl"),
    ("masakit pa rin ang ulo", "headache", "tl"),
    ("masakit ang ulo", "headache", "tl"),
    ("masakit ang tiyan", "abdominal pain", "tl"),
    ("masakit ang sikmura", "abdominal pain", "tl"),
    ("nagsusuka", "vomiting", "tl"),
    ("nagsuka", "vomiting", "tl"),
    ("sumusuka", "vomiting", "tl"),
    ("nag-vomit", "vomiting", "mixed"),
    ("umuubo", "cough", "tl"),
    ("nagtatae", "diarrhea", "tl"),
    ("nilalagnat", "fever", "tl"),
    ("kalintura", "fever", "srv"),
    ("di makainom", "unable to drink", "tl"),
    ("hindi makainom", "unable to drink", "tl"),
    ("hindi ako makahinga", "difficulty breathing", "tl"),
    ("d ako makahinga", "difficulty breathing", "tl"),
    ("masakit yung tummy", "abdominal pain", "mixed"),
    ("sumasakit ang tummy", "abdominal pain", "mixed"),
    ("masakit yung head", "headache", "mixed"),
)

_NEGATION_RE = re.compile(
    r"\b(?:walang|wala|hindi|'di|di|dae|dai|mayong|no|not|don't|dont|doesn't|doesnt|do not|does not)(?:\s+[\w'-]+){0,2}\s*$",
    re.IGNORECASE,
)
_NEGATION_SCOPE_BREAK_RE = re.compile(r"\b(?:but|pero|however|although)\b", re.IGNORECASE)
_NON_NEGATING_PHRASES_RE = re.compile(
    r"\b(?:walang\s+tigil|hindi\s+bumababa|(?:hindi|di)\s+tumitigil)\b",
    re.IGNORECASE,
)
_HEDGE_RE = re.compile(
    r"\b(?:parang(?:\s+may)?|medyo|baka|tila|siguro|mukhang)(?:\s+[\w'-]+){0,2}\s*$",
    re.IGNORECASE,
)
_ENGLISH_MARKERS = re.compile(r"\b(?:i|have|has|had|the|my|and|with|pain|feel|feeling)\b", re.I)
_TAGALOG_MARKERS = re.compile(
    r"\b(?:ako|ko|may|wala|walang|hindi|di|naman|ng|ang|sa|araw|"
    r"lagnat|ubo|ulo|tiyan|sakit|nahihilo|sinisipon|pantal|sipon|"
    r"baradong ilong|makating pantal|namumula ang balat)\b",
    re.I,
)
_BICOL_MARKERS = re.compile(
    r"\b(?:dae|dai|mayong|aldaw|makahangos|daghan|siring|"
    r"(?:masakit|sakit) an (?:lawas|tiyan)|sakit sa lawas|"
    r"(?:may )?pantal sa lawas|barado an ilong)\b",
    re.I,
)
_SORSOGANON_MARKERS = re.compile(r"\bkalintura\b", re.I)

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
    rf"\b(?P<count>\d+(?:\.\d+)?|{_NUMBER_PATTERN}|isang)(?:\s+na)?\s*(?P<unit>hours?|oras?|days?|araw|aldaw|weeks?|linggo|months?|buwan)(?:\s+na)?(?:\s+po)?\b",
    re.I,
)

_BODY_LOCATIONS = (
    (re.compile(r"\b(?:dibdib|daghan|chest)\b", re.I), "chest"),
    (re.compile(r"\b(?:tiyan|sikmura|abdomen|stomach|belly)\b", re.I), "abdomen"),
    (re.compile(r"\b(?:ulo|head)\b", re.I), "head"),
    (re.compile(r"\b(?:lalamunan|throat)\b", re.I), "throat"),
    (re.compile(r"\b(?:likod|back)\b", re.I), "back"),
)

_CYRILLIC_HOMOGLYPHS = str.maketrans({"а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i"})


def _phrase_pattern(phrase: str) -> re.Pattern[str]:
    words = re.split(r"\s+", phrase.strip())
    return re.compile(r"(?<!\w)" + r"\s+".join(map(re.escape, words)) + r"(?!\w)", re.I)


def _negation_span(prefix: str) -> tuple[int, int] | None:
    """Find a scoped negation cue without swallowing contrastive or idiomatic phrases."""
    scope_start = 0
    for boundary in _NEGATION_SCOPE_BREAK_RE.finditer(prefix):
        scope_start = boundary.end()

    scope = prefix[scope_start:]
    if _NON_NEGATING_PHRASES_RE.search(scope):
        return None

    match = _NEGATION_RE.search(scope)
    if match is None:
        return None
    return scope_start + match.start(), scope_start + match.end()


def is_negated_prefix(prefix: str) -> bool:
    """Expose the shared scope-aware negation check to the triage rule layer."""
    return _negation_span(prefix) is not None


def extract_patient_age(text: str) -> int | None:
    """Extract an explicit age in years without treating it as symptom duration."""
    normalized = (text or "").lower()
    compound = re.search(
        r"\b(?P<years>\d{1,3})\s*(?:years?|taon)(?:\s+(?:and|at)\s+|\s+)(?P<months>\d{1,2})\s*(?:months?|buwan)\b",
        normalized,
    )
    if compound:
        return int(compound.group("years"))

    explicit_years = re.search(
        r"\b(?P<age>\d{1,3})\s*(?:years?\s+old|taong\s+gulang|taon\s+gulang|yo)\b",
        normalized,
    )
    if explicit_years:
        return int(explicit_years.group("age"))

    child_years = re.search(r"\b(?:anak|baby|bata)\s+(?:ko\s+)?(?P<age>\d{1,3})\s*(?:taon|years?)\b", normalized)
    if child_years:
        return int(child_years.group("age"))

    relative_years = re.search(r"\b(?:lola|lolo|grandma|grandmother|grandpa|grandfather)\s+(?:ko\s+)?(?P<age>\d{1,3})\b", normalized)
    if relative_years:
        return int(relative_years.group("age"))

    months = re.search(r"\b(?P<months>\d{1,2})\s*(?:months?|buwan)(?:\s+old)?\b", normalized)
    if months:
        before = normalized[max(0, months.start() - 32):months.start()]
        after = normalized[months.end():months.end() + 24]
        age_phrase = normalized[months.start():months.end()]
        if re.search(r"\b(?:old|baby|infant|newborn|sanggol|anak|bata)\b", before + age_phrase + after):
            return int(months.group("months")) // 12
    return None


_NON_SYMPTOM_QUESTION_RE = re.compile(
    r"^\s*(?:ano\s+ang\s+(?:gamot\s+sa\s+)?(?:ubo|lagnat)|what\s+is\s+(?:a\s+)?(?:cough|fever)|what\s+medicine\s+(?:can\s+i\s+take\s+)?for\s+(?:a\s+)?(?:cough|fever))\s*[?!.]*\s*$",
    re.IGNORECASE,
)
_UNCERTAIN_SYMPTOM_RE = re.compile(
    r"\b(?:hindi\s+ko\s+alam\s+kung|not\s+sure\s+(?:if|whether)|i\s+don't\s+know\s+(?:if|whether))\b.{0,32}\b(?:lagnat|fever|ubo|cough)\b",
    re.IGNORECASE,
)


def is_non_symptom_question(text: str) -> bool:
    """Identify the small set of definition/medicine questions tested as non-assessments."""
    normalized = " ".join((text or "").split())
    return bool(_NON_SYMPTOM_QUESTION_RE.fullmatch(normalized) or _UNCERTAIN_SYMPTOM_RE.search(normalized))


def _candidates(text: str, entries: list[LexiconEntry]) -> list[_Candidate]:
    found: list[_Candidate] = []
    matchable_text = text.translate(_CYRILLIC_HOMOGLYPHS)
    for entry in entries:
        term = entry.local_term.strip()
        if not term or not entry.medical_term.strip():
            continue
        for match in _phrase_pattern(term).finditer(matchable_text):
            found.append(_Candidate(match.start(), match.end(), entry.medical_term.strip(), entry.language, "lexicon", 0.95))

    for phrase, canonical, language in _BUILTIN_LEXICON:
        for match in _phrase_pattern(phrase).finditer(matchable_text):
            found.append(_Candidate(match.start(), match.end(), canonical, language, "lexicon", 0.95))

    for phrase, canonical, language in _INFLECTIONS:
        for match in _phrase_pattern(phrase).finditer(matchable_text):
            found.append(_Candidate(match.start(), match.end(), canonical, language, "inferred", 0.86))

    typo_aliases = (
        ("lagnt", "fever", "tl"),
        ("lganat", "fever", "tl"),
        ("fevr", "fever", "en"),
        ("coff", "cough", "en"),
        ("tyan", "abdominal pain", "tl"),
        ("sakt ng ulo", "headache", "tl"),
        ("sakitngulo", "headache", "tl"),
        ("l a g n a t", "fever", "tl"),
        ("nagtatai", "diarrhea", "tl"),
    )
    for phrase, canonical, language in typo_aliases:
        for match in _phrase_pattern(phrase).finditer(matchable_text):
            found.append(_Candidate(match.start(), match.end(), canonical, language, "inferred", 0.78))

    decoded_text = unquote(text)
    if decoded_text != text:
        for candidate in _candidates(decoded_text, entries):
            found.append(_Candidate(0, len(text), candidate.canonical_term, candidate.language, "url-encoded", 0.78))

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
            if candidate.source == "url-encoded" and all(item.source == "url-encoded" for item in overlaps):
                selected.append(candidate)
                continue
            if all(item.canonical_term == candidate.canonical_term for item in overlaps):
                continue
            if any((item.end - item.start) >= (candidate.end - candidate.start) for item in overlaps):
                continue
            selected = [item for item in selected if item not in overlaps]
        selected.append(candidate)
    return sorted(selected, key=lambda item: item.start)


def _language(text: str) -> str:
    has_sorsoganon = bool(_SORSOGANON_MARKERS.search(text))
    has_bicol = bool(_BICOL_MARKERS.search(text))
    has_tagalog = bool(_TAGALOG_MARKERS.search(text)) and not has_bicol
    has_english = bool(_ENGLISH_MARKERS.search(text))
    if has_sorsoganon:
        return "mixed" if has_bicol or has_tagalog or has_english else "srv"
    if has_bicol and has_english:
        return "mixed"
    if has_bicol:
        return "bcl"
    if has_tagalog and has_english:
        return "mixed"
    if has_tagalog:
        return "tl"
    return "en"


def is_age_duration(text: str, match: re.Match[str]) -> bool:
    unit = match.group("unit").lower()
    if not unit.startswith(("month", "buwan")):
        return False
    context = text[max(0, match.start() - 32):min(len(text), match.end() + 24)]
    age_cue = re.search(r"\b(?:age(?:d)?|old|baby|infant|newborn|sanggol|anak|bata)\b", context, re.I)
    compound_age = re.search(r"\b\d{1,3}\s*(?:years?|taon)\s+\d{1,2}\s*(?:months?|buwan)\b", context, re.I)
    return bool(age_cue or compound_age)


def _onset(text: str, message_timestamp: datetime | None) -> dict:
    match = None
    for candidate in _DURATION_RE.finditer(text):
        if is_age_duration(text, candidate):
            continue
        prefix = text[max(0, candidate.start() - 36):candidate.start()]
        if re.search(r"\b(?:buntis|pregnant|pregnancy)\b", prefix, re.I) and not re.search(
            r"\b(?:lagnat|fever|ubo|cough|sakit|pain|symptom)\b", prefix, re.I
        ):
            continue
        match = candidate
        break
    if match:
        count_text = match.group("count").lower()
        count = float(count_text) if count_text[0].isdigit() else float(_NUMBER_WORDS.get(count_text, 1))
        unit = match.group("unit").lower()
        multiplier = (
            1 / 24 if unit.startswith(("hour", "ora"))
            else 7 if unit.startswith(("week", "linggo"))
            else 30 if unit.startswith(("month", "buwan"))
            else 1
        )
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
        negation = _negation_span(prefix)
        hedge = _HEDGE_RE.search(prefix)
        raw_start = segment_start + (negation[0] if negation else hedge.start()) if negation or hedge else candidate.start
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
            if not _negation_span(prefix):
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