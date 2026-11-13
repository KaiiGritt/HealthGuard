from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import SymptomLexicon, User
from app.routers.assessment import (
    _load_entries,
    create_lexicon_entry,
    review_lexicon_entry,
    update_lexicon_entry,
    update_lexicon_status,
)
from app.schemas import LexiconCreateRequest, LexiconUpdateRequest, UserStatusUpdate


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_admin_can_create_update_and_deactivate_lexicon_entry(db_session: Session) -> None:
    admin = User(
        full_name="Admin",
        email="admin@example.test",
        password_hash="test",
        role="admin",
    )
    db_session.add(admin)
    db_session.commit()

    created = create_lexicon_entry(
        LexiconCreateRequest(
            local_term="masakit ang likod",
            language="tl",
            medical_term="back pain",
            severity_weight=2,
            category="musculoskeletal",
        ),
        db_session,
        admin,
    )
    assert created.is_active is True
    assert "back pain" not in {entry.medical_term for entry in _load_entries(db_session)}

    updated = update_lexicon_entry(
        created.id,
        LexiconUpdateRequest(
            local_term="masakit ang ibabang likod",
            language="tl",
            medical_term="back pain",
            severity_weight=3,
            category="musculoskeletal",
        ),
        db_session,
        admin,
    )
    assert updated.local_term == "masakit ang ibabang likod"
    assert updated.severity_weight == 3
    assert updated.review_status == "pending"
    assert "back pain" not in {entry.medical_term for entry in _load_entries(db_session)}

    approved = review_lexicon_entry(created.id, db_session, admin)
    assert approved.review_status == "approved"
    assert "back pain" in {entry.medical_term for entry in _load_entries(db_session)}

    inactive = update_lexicon_status(
        created.id,
        UserStatusUpdate(is_active=False),
        db_session,
        admin,
    )
    assert inactive.is_active is False
    assert "back pain" not in {entry.medical_term for entry in _load_entries(db_session)}

    active = update_lexicon_status(
        created.id,
        UserStatusUpdate(is_active=True),
        db_session,
        admin,
    )
    assert active.is_active is True
    assert "back pain" in {entry.medical_term for entry in _load_entries(db_session)}


def test_lexicon_seed_preserves_admin_entries_and_changes(db_session: Session) -> None:
    from app.seed import seed_lexicon

    admin_entry = SymptomLexicon(
        local_term="community phrase",
        language="tl",
        medical_term="fever",
        severity_weight=4,
        category="community",
    )
    db_session.add(admin_entry)
    db_session.commit()

    seed_lexicon(db_session)

    stored = db_session.query(SymptomLexicon).filter_by(local_term="community phrase").one()
    assert stored.severity_weight == 4
    assert stored.category == "community"
