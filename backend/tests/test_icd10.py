from types import SimpleNamespace
from unittest.mock import Mock

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

import app.database as database
from app.database import Base
from app.icd10 import codes_for_reported_symptoms, uncoded_reported_symptoms
from app.models import Assessment
from app.routers.assessment import analyze_symptoms
from app.schemas import AnalyzeRequest
from app.seed import LEXICON_SEED, SELECTABLE_SYMPTOMS


def test_reported_symptoms_receive_who_icd10_references() -> None:
    codes = codes_for_reported_symptoms(["Fever", "cough", "fever"])

    assert [(item["symptom"], item["code"]) for item in codes] == [
        ("fever", "R50.9"),
        ("cough", "R05"),
    ]
    assert all(item["coding_system"] == "WHO ICD-10 (2019)" for item in codes)
    assert all(item["source_url"].startswith("https://icd.who.int/") for item in codes)
    assert all(item["review_status"] == "pending_review" for item in codes)
    assert all(item["reviewer"] is None and item["reviewed_at"] is None for item in codes)


def test_ambiguous_reported_terms_are_not_given_misleading_codes() -> None:
    assert codes_for_reported_symptoms(
        ["blood in stool", "colds / rhinitis", "numbness or tingling"]
    ) == []
    assert all(
        item["reason"]
        for item in uncoded_reported_symptoms(
            ["blood in stool", "colds / rhinitis", "numbness or tingling"]
        )
    )


def test_every_supported_symptom_is_mapped_or_has_an_explicit_uncoded_reason() -> None:
    codes = codes_for_reported_symptoms(SELECTABLE_SYMPTOMS)
    uncoded = uncoded_reported_symptoms(SELECTABLE_SYMPTOMS)

    assert {item["symptom"] for item in codes} | {
        item["symptom"] for item in uncoded
    } == set(SELECTABLE_SYMPTOMS)
    assert not ({item["symptom"] for item in codes} & {
        item["symptom"] for item in uncoded
    })


def test_analysis_response_includes_codes_for_recognized_symptoms() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry, review_status="approved") for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(AnalyzeRequest(input_text="fever"), db, None)

    assert result.icd10_codes[0].code == "R50.9"
    assert result.icd10_codes[0].symptom == "fever"
    assert result.icd10_codes[0].review_status == "pending_review"


def test_analysis_response_explains_when_a_symptom_is_left_uncoded() -> None:
    db = Mock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        SimpleNamespace(**entry, review_status="approved") for entry in LEXICON_SEED
    ]

    result = analyze_symptoms(
        AnalyzeRequest(selected_symptoms=["blood in stool"], method="select"),
        db,
        None,
    )

    assert result.icd10_codes == []
    assert result.icd10_uncoded[0].symptom == "blood in stool"
    assert "clarify" in result.icd10_uncoded[0].reason


def test_assessment_persists_icd10_references() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    codes = codes_for_reported_symptoms(["headache"])

    with Session(engine) as db:
        record = Assessment(
            detected_symptoms=["headache"],
            icd10_codes=codes,
            risk_level="GREEN",
        )
        db.add(record)
        db.commit()
        stored = db.scalar(select(Assessment).where(Assessment.id == record.id))

    assert stored is not None
    assert stored.icd10_codes == codes


def test_schema_migration_adds_and_backfills_existing_records(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE assessments DROP COLUMN icd10_codes"))
        connection.execute(text("ALTER TABLE assessments DROP COLUMN icd10_uncoded"))
        connection.execute(
            text(
                "INSERT INTO assessments "
                "(input_text, method, detected_symptoms, symptom_confidence, risk_level, "
                "reason, recommendation, triggered_rules) "
                "VALUES ('fever', 'text', '[\"fever\"]', '{}', 'GREEN', '', '', '[]')"
            )
        )

    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=engine, future=True))

    database.migrate_assessment_icd10_schema()

    with Session(engine) as db:
        record = db.scalar(select(Assessment))

    assert record is not None
    assert record.icd10_codes[0]["code"] == "R50.9"
    assert record.icd10_codes[0]["review_status"] == "pending_review"
    assert record.icd10_uncoded == []


def test_schema_migration_refreshes_legacy_code_metadata(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(
            Assessment(
                detected_symptoms=["fever"],
                icd10_codes=[
                    {
                        "symptom": "fever",
                        "code": "R50.9",
                        "description": "Fever, unspecified",
                        "coding_system": "WHO ICD-10 (2019)",
                    }
                ],
                icd10_uncoded=[],
                risk_level="GREEN",
            )
        )
        db.commit()
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE assessments DROP COLUMN icd10_uncoded"))

    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=engine, future=True))

    database.migrate_assessment_icd10_schema()

    with Session(engine) as db:
        record = db.scalar(select(Assessment))

    assert record is not None
    assert record.icd10_codes[0]["review_status"] == "pending_review"
    assert record.icd10_codes[0]["source_url"].startswith("https://icd.who.int/")
    assert record.icd10_uncoded == []
