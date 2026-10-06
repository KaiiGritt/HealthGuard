from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Assessment, AssessmentCaseActivity, User
from app.routers.assessment import _build_barangay_stats, add_assessment_case_activity
from app.schemas import AssessmentCaseActivityIn


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


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

    updated = add_assessment_case_activity(
        assessment.id,
        AssessmentCaseActivityIn(kind="status", status="In progress"),
        db_session,
        mho,
    )
    assert updated.case_status == "In progress"
    assert len(updated.case_activities) == 2


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
