from app.case_summary import NO_DETAILS, RED_TRIAGE_MISMATCH, build_case_summary


def test_summary_preserves_resident_language_and_only_lists_extracted_red_flags() -> None:
    summary = build_case_summary(
        chief_complaint="Matinding sakit sa tiyan, lumipat sa kanang ibaba, hindi na makagalaw",
        detected_symptoms=["abdominal pain", "difficulty moving"],
        symptom_extraction={
            "detected_symptoms": [
                {"canonical_term": "abdominal pain", "raw_phrase": "sakit sa tiyan"},
                {"canonical_term": "difficulty moving", "raw_phrase": "hindi na makagalaw"},
            ],
            "red_flags": [
                "pain migrated to lower-right abdomen",
                "difficulty moving / functional impairment",
            ],
            "onset": {
                "days_since_onset": None,
                "approximate": True,
                "raw_phrase": "3-7 days",
            },
        },
        triage_level="RED",
    )

    assert summary == {
        "chief_complaint_summary": "Matinding sakit sa tiyan, lumipat sa kanang ibaba, hindi na makagalaw.",
        "urgency_reasons": [
            "Pain migrated to lower-right abdomen",
            "Difficulty moving",
        ],
        "onset_display": "About 3-7 days ago (uncertain)",
        "triage_badge_color": "red",
        "validation_note": None,
    }


def test_red_triage_without_red_flags_is_marked_for_review() -> None:
    summary = build_case_summary(
        chief_complaint="",
        detected_symptoms=[],
        symptom_extraction={
            "detected_symptoms": [],
            "red_flags": [],
            "onset": {"days_since_onset": None, "approximate": True},
        },
        triage_level="red",
    )

    assert summary["chief_complaint_summary"] == NO_DETAILS
    assert summary["urgency_reasons"] == []
    assert summary["triage_badge_color"] == "needs-info"
    assert summary["validation_note"] == RED_TRIAGE_MISMATCH


def test_empty_extraction_uses_raw_complaint_and_never_infers_red_flags() -> None:
    summary = build_case_summary(
        chief_complaint="medyo masakit yung tiyan ko pero okay lang naman",
        detected_symptoms=[],
        symptom_extraction={
            "detected_symptoms": [],
            "red_flags": [],
            "onset": {"days_since_onset": 0, "approximate": False},
        },
        triage_level="green",
    )

    assert summary["chief_complaint_summary"] == "medyo masakit yung tiyan ko pero okay lang naman."
    assert summary["urgency_reasons"] == []
    assert summary["onset_display"] == "Started today"
    assert summary["triage_badge_color"] == "green"
    assert summary["validation_note"] is None


def test_missing_complaint_uses_extracted_symptoms_without_inventing_details() -> None:
    summary = build_case_summary(
        chief_complaint="",
        detected_symptoms=["headache", "dizziness"],
        symptom_extraction={
            "detected_symptoms": [
                {"canonical_term": "headache", "raw_phrase": "sakit ng ulo"},
                {"canonical_term": "dizziness", "raw_phrase": "nahihilo"},
            ],
            "red_flags": [],
            "onset": {},
        },
        triage_level="yellow",
    )

    assert summary["chief_complaint_summary"] == "sakit ng ulo, nahihilo."
    assert summary["urgency_reasons"] == []
    assert summary["triage_badge_color"] == "yellow"


def test_approximate_onset_is_never_shown_as_exact() -> None:
    summary = build_case_summary(
        chief_complaint="Fever",
        detected_symptoms=["fever"],
        symptom_extraction={
            "detected_symptoms": [{"canonical_term": "fever"}],
            "red_flags": [],
            "onset": {
                "days_since_onset": 0,
                "approximate": True,
                "raw_phrase": "this morning",
            },
        },
        triage_level="green",
    )

    assert summary["onset_display"] == "About this morning (uncertain)"
