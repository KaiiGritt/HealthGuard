from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Assessment, AssessmentCaseActivity, PreMedication, User
from app.nlp import specialist_adapter
from app.routers import assessment
from app.routers.assessment import _build_barangay_stats, _build_weekly_trend, add_assessment_case_activity, history
from app.schemas import AssessmentCaseActivityIn


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_admin_modules_reports_biomedical_model_availability(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin = User(
        full_name="Admin",
        email="admin@example.test",
        password_hash="test",
        role="admin",
    )
    db_session.add(admin)
    db_session.commit()

    monkeypatch.setattr(assessment.scispacy_adapter, "is_available", lambda: False)
    monkeypatch.setattr(specialist_adapter, "is_available", lambda: False)
    dormant = assessment.admin_modules(db_session, admin)
    assert dormant.biomedical_lexicon_active is False
    assert dormant.specialist_lexicon_active is False

    monkeypatch.setattr(assessment.scispacy_adapter, "is_available", lambda: True)
    monkeypatch.setattr(specialist_adapter, "is_available", lambda: True)
    active = assessment.admin_modules(db_session, admin)
    assert active.biomedical_lexicon_active is True
    assert active.specialist_lexicon_active is True


def test_case_activity_is_persisted_and_returned(db_session: Session) -> None:
    mho = User(
        full_name="MHO Staff",
        email="mho@example.test",
        password_hash="test",
        role="mho",
    )
    assessment = Assessment(risk_level="RED", input_text="Severe chest pain")
    db_session.add_all([mho, assessment])
    db_session.commit()
    db_session.refresh(mho)
    db_session.refresh(assessment)

    response = add_assessment_case_activity(
        assessment.id,
        AssessmentCaseActivityIn(kind="contact_attempt", details="Called; no answer."),
        db_session,
        mho,
    )

    stored = db_session.execute(select(AssessmentCaseActivity)).scalar_one()
    assert stored.user_id == mho.id
    assert response.case_status == "New"
    assert response.case_activities[0].kind == "contact_attempt"
    assert response.case_activities[0].details == "Called; no answer."
    assert response.case_activities[0].actor_name == "MHO Staff"

    updated = add_assessment_case_activity(
        assessment.id,
        AssessmentCaseActivityIn(kind="status", status="In progress"),
        db_session,
        mho,
    )
    assert updated.case_status == "In progress"
    assert len(updated.case_activities) == 2

    contacted = add_assessment_case_activity(
        assessment.id,
        AssessmentCaseActivityIn(kind="contacted", details="Resident reached by phone."),
        db_session,
        mho,
    )
    assert contacted.case_activities[0].kind == "contacted"
    assert contacted.case_activities[0].details == "Resident reached by phone."

    followed_up = add_assessment_case_activity(
        assessment.id,
        AssessmentCaseActivityIn(kind="follow_up", details="Follow-up completed."),
        db_session,
        mho,
    )
    assert followed_up.case_activities[0].kind == "follow_up"
    assert followed_up.case_activities[0].details == "Follow-up completed."


def test_history_loads_related_data_without_per_record_queries(db_session: Session) -> None:
    resident = User(
        full_name="Resident",
        email="resident@example.test",
        password_hash="test",
        role="resident",
    )
    records = [
        Assessment(
            risk_level="GREEN",
            detected_symptoms=["cough"],
        )
        for _ in range(3)
    ]
    db_session.add(resident)
    db_session.flush()
    for record in records:
        record.user_id = resident.id
    db_session.add_all(records)
    db_session.flush()
    db_session.add_all(
        [
            PreMedication(
                assessment_id=record.id,
                medication_name="Guidance",
                dosage="As directed",
            )
            for record in records
        ]
    )
    db_session.commit()
    db_session.refresh(resident)

    statements: list[str] = []

    def count_selects(_connection, _cursor, statement, _parameters, _context, _executemany):
        if statement.lstrip().lower().startswith("select"):
            statements.append(statement)

    bind = db_session.get_bind()
    event.listen(bind, "before_cursor_execute", count_selects)
    try:
        response = history(50, db_session, resident)
    finally:
        event.remove(bind, "before_cursor_execute", count_selects)

    assert len(response) == 3
    assert all(item.pre_medication and item.pre_medication.medication_name == "Guidance" for item in response)
    assert len(statements) == 3


def test_case_activity_rejects_non_red_assessments(db_session: Session) -> None:
    mho = User(
        full_name="MHO Staff",
        email="mho@example.test",
        password_hash="test",
        role="mho",
    )
    assessment = Assessment(risk_level="YELLOW", input_text="Mild cough")
    db_session.add_all([mho, assessment])
    db_session.commit()
    db_session.refresh(assessment)

    with pytest.raises(HTTPException) as error:
        add_assessment_case_activity(
            assessment.id,
            AssessmentCaseActivityIn(kind="note", details="Follow-up planned."),
            db_session,
            mho,
        )

    assert error.value.status_code == 400
    assert db_session.execute(select(AssessmentCaseActivity)).scalars().all() == []


def test_resolved_red_case_is_removed_from_open_barangay_count(db_session: Session) -> None:
    mho = User(
        full_name="MHO Staff",
        email="mho@example.test",
        password_hash="test",
        role="mho",
        barangay="Sample",
    )
    db_session.add(mho)
    db_session.commit()
    db_session.refresh(mho)
    assessment = Assessment(
        user_id=mho.id,
        risk_level="RED",
        input_text="Severe chest pain",
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    add_assessment_case_activity(
        assessment.id,
        AssessmentCaseActivityIn(kind="status", status="Resolved"),
        db_session,
        mho,
    )

    stats = _build_barangay_stats(db_session)
    sample_barangay = next(item for item in stats if item.barangay == "Sample")
    assert sample_barangay.urgent == 0


def test_weekly_trend_includes_counts_by_triage_severity(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        assessment,
        "_utc_now",
        lambda: datetime(2026, 11, 5, 12, 0, tzinfo=timezone.utc),
    )
    db_session.add_all(
        [
            Assessment(risk_level="GREEN", created_at=datetime(2026, 10, 26, 9, 0)),
            Assessment(risk_level="RED", created_at=datetime(2026, 11, 2, 9, 0)),
            Assessment(risk_level="YELLOW", created_at=datetime(2026, 11, 3, 9, 0)),
        ]
    )
    db_session.commit()

    trend = _build_weekly_trend(db_session)

    assert trend[-2].count == 1
    assert (trend[-2].green, trend[-2].yellow, trend[-2].red) == (1, 0, 0)
    assert trend[-1].count == 2
    assert (trend[-1].green, trend[-1].yellow, trend[-1].red) == (0, 1, 1)
