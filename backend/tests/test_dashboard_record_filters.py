from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Assessment, User
from app.routers.assessment import dashboard_records


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_dashboard_records_apply_date_risk_search_and_pagination(db_session: Session) -> None:
    mho = User(
        full_name="MHO",
        email="mho@example.test",
        password_hash="test",
        role="mho",
    )
    resident = User(
        full_name="Ana Resident",
        email="resident@example.test",
        password_hash="test",
        role="resident",
        barangay="Bacolod",
    )
    db_session.add_all([mho, resident])
    db_session.flush()
    db_session.add_all([
        Assessment(
            user_id=resident.id,
            input_text="fever and cough",
            detected_symptoms=["fever", "cough"],
            risk_level="YELLOW",
            created_at=datetime(2026, 11, 12, 12, tzinfo=timezone.utc),
        ),
        Assessment(
            user_id=resident.id,
            input_text="headache",
            detected_symptoms=["headache"],
            risk_level="GREEN",
            created_at=datetime(2026, 11, 10, 12, tzinfo=timezone.utc),
        ),
        Assessment(
            user_id=None,
            input_text="anonymous breathing difficulty",
            detected_symptoms=["difficulty breathing"],
            risk_level="RED",
            created_at=datetime(2026, 11, 12, 14, tzinfo=timezone.utc),
        ),
    ])
    db_session.commit()

    result = dashboard_records(
        date_from=datetime(2026, 11, 12).date(),
        date_to=datetime(2026, 11, 12).date(),
        risk_level="YELLOW",
        barangay="Bacolod",
        search="Ana",
        page=1,
        page_size=1,
        db=db_session,
        user=mho,
    )

    assert result.total == 1
    assert len(result.items) == 1
    assert result.items[0].resident_name == "Ana Resident"
    assert result.items[0].risk_level == "YELLOW"


def test_dashboard_records_rejects_reversed_date_range(db_session: Session) -> None:
    mho = User(
        full_name="MHO",
        email="mho@example.test",
        password_hash="test",
        role="mho",
    )
    db_session.add(mho)
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        dashboard_records(
            date_from=datetime(2026, 11, 13).date(),
            date_to=datetime(2026, 11, 12).date(),
            db=db_session,
            user=mho,
        )

    assert error.value.status_code == 422
