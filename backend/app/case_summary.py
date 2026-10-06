"""Format stored symptom-extraction signals for quick MHO case review."""
from __future__ import annotations

import math
import re
from typing import Any


NO_DETAILS = "No symptom details recorded yet — contact resident to gather more information."
RED_TRIAGE_MISMATCH = (
    "Input marked as red triage but no symptoms or red flags were recorded — "
    "this looks like a data gap upstream, flag for review rather than displaying "
    "as a confirmed urgent case."
)


def _symptom_terms(extraction: dict[str, Any], fallback: list[str]) -> list[str]:
    detected = extraction.get("detected_symptoms")
    if isinstance(detected, list):
        terms = [
            str(item.get("raw_phrase") or item.get("canonical_term") or "").strip()
            for item in detected
            if isinstance(item, dict)
        ]
        terms = [term for term in terms if term]
        if terms:
            return terms
    return [str(term).strip() for term in fallback if str(term).strip()]


def _onset_display(onset: Any) -> str:
    if not isinstance(onset, dict):
        return "Timing not recorded"

    raw_phrase = str(onset.get("raw_phrase") or "").strip()
    days = onset.get("days_since_onset")
    approximate = onset.get("approximate") is True

    if approximate:
        if raw_phrase:
            relative_phrase = bool(
                re.search(r"\b(?:today|yesterday|this morning|this week|this month)\b", raw_phrase, re.I)
            )
            ago = "" if relative_phrase else " ago"
            return f"About {raw_phrase}{ago} (uncertain)"
        if days is None:
            return "Timing not recorded"

    if days is None:
        return "Timing not recorded"

    try:
        days_value = float(days)
    except (TypeError, ValueError):
        return "Timing not recorded"
    if not math.isfinite(days_value) or days_value < 0:
        return "Timing not recorded"
    if approximate:
        if days_value == 0:
            return "About today (uncertain)"
        if days_value == 1:
            return "About a day ago (uncertain)"
        number = int(days_value) if days_value.is_integer() else days_value
        return f"About {number} days ago (uncertain)"
    if days_value == 0:
        return "Started today"
    if days_value == 1:
        return "Started yesterday"
    number = int(days_value) if days_value.is_integer() else days_value
    return f"{number} days ago"


def _finish_sentence(text: str) -> str:
    text = " ".join(text.split())
    if not text:
        return ""
    return text if text[-1] in ".!?" else f"{text}."


def build_case_summary(
    *,
    chief_complaint: str | None,
    detected_symptoms: list[str] | None,
    symptom_extraction: dict[str, Any] | None,
    triage_level: str,
) -> dict[str, Any]:
    extraction = symptom_extraction if isinstance(symptom_extraction, dict) else {}
    complaint = (chief_complaint or "").strip()
    symptoms = _symptom_terms(extraction, detected_symptoms or [])
    summary = _finish_sentence(complaint) if complaint else (
        _finish_sentence(", ".join(symptoms)) if symptoms else NO_DETAILS
    )

    raw_flags = extraction.get("red_flags")
    red_flags = (
        [str(flag).strip() for flag in raw_flags if str(flag).strip()]
        if isinstance(raw_flags, list)
        else []
    )
    urgency_reasons = []
    for flag in red_flags:
        short_flag = re.split(r"\s*/\s*", flag, maxsplit=1)[0].strip()
        if short_flag:
            urgency_reasons.append(short_flag[0].upper() + short_flag[1:])
    level = (triage_level or "").strip().lower()
    validation_note = None

    if level == "red" and not red_flags:
        color = "needs-info"
        validation_note = (
            RED_TRIAGE_MISMATCH
            if not complaint and not symptoms
            else "Input marked as red triage but no extracted red flags were recorded — flag this upstream mismatch for review."
        )
    elif not complaint and not symptoms:
        color = "needs-info"
    elif level in {"green", "yellow"}:
        color = level
    elif level == "red":
        color = "red"
    else:
        color = "needs-info"

    onset = extraction.get("onset")
    return {
        "chief_complaint_summary": summary,
        "urgency_reasons": urgency_reasons,
        "onset_display": _onset_display(onset),
        "triage_badge_color": color,
        "validation_note": validation_note,
    }
