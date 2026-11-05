from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Assessment, User
from app.nlp.lexicon import LexiconEntry
from app.routers import assessment
from app.schemas import AdminRulePreviewRequest
from app.seed import LEXICON_SEED


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_admin_rule_preview_uses_triage_engine_without_saving(
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
    monkeypatch.setattr(
        assessment,
        "_load_entries",
        lambda _db: [LexiconEntry(**entry) for entry in LEXICON_SEED],
    )

    result = assessment.preview_admin_triage_rules(
        AdminRulePreviewRequest(input_text="difficulty breathing"),
        db_session,
        admin,
    )

    assert result.risk_level == "RED"
    assert "difficulty breathing" in {item.medical_term for item in result.detected_symptoms}
    assert "difficulty-breathing-override" in {item.name for item in result.triggered_rules}
    assert db_session.execute(select(Assessment)).scalars().all() == []


def test_admin_rule_preview_rejects_unrecognized_symptoms(
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
    monkeypatch.setattr(assessment, "_load_entries", lambda _db: [])

    with pytest.raises(HTTPException) as error:
        assessment.preview_admin_triage_rules(
            AdminRulePreviewRequest(input_text="the weather is sunny"),
            db_session,
            admin,
        )

    assert error.value.status_code == 422
    assert "No recognized symptom" in error.value.detail
