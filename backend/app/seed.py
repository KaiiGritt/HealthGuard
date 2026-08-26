"""Canonical bilingual symptom lexicon and idempotent DB seeding.

LEXICON_SEED is the single source of truth for the two-layer lexicon (Layer 2).
Each entry maps a local term (English or Tagalog) to a standard medical term with a
severity weight used by the rule engine. The list is also importable directly for
standalone engine testing without a database.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

# severity_weight scale: 1 mild, 2 moderate, 4 high/urgent.
LEXICON_SEED: list[dict] = [
    # medical_term        local_term            lang  weight  category
    # --- fever ---
    {"medical_term": "fever", "local_term": "fever", "language": "en", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "lagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    # --- cough ---
    {"medical_term": "cough", "local_term": "cough", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    # --- headache ---
    {"medical_term": "headache", "local_term": "headache", "language": "en", "severity_weight": 1, "category": "neurological"},
    {"medical_term": "headache", "local_term": "sakit ng ulo", "language": "tl", "severity_weight": 1, "category": "neurological"},
    # --- abdominal pain ---
    {"medical_term": "abdominal pain", "local_term": "abdominal pain", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "sakit ng tiyan", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "stomach ache", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    # --- vomiting ---
    {"medical_term": "vomiting", "local_term": "vomiting", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "pagsusuka", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "nagsusuka", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    # --- diarrhea ---
    {"medical_term": "diarrhea", "local_term": "diarrhea", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "pagtatae", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    # --- difficulty breathing (high severity) ---
    {"medical_term": "difficulty breathing", "local_term": "difficulty breathing", "language": "en", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "shortness of breath", "language": "en", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hirap huminga", "language": "tl", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hindi makahinga", "language": "tl", "severity_weight": 4, "category": "respiratory"},
]

# The canonical symptom list surfaced as selectable chips in the UI.
SELECTABLE_SYMPTOMS: list[str] = [
    "fever",
    "cough",
    "headache",
    "abdominal pain",
    "vomiting",
    "diarrhea",
    "difficulty breathing",
]


def seed_lexicon(db: Session) -> int:
    """Insert any lexicon entries that are not already present. Idempotent.

    Returns the number of new rows inserted.
    """
    from sqlalchemy import select

    from .models import SymptomLexicon

    existing = {
        (row.local_term, row.language)
        for row in db.execute(select(SymptomLexicon)).scalars().all()
    }
    inserted = 0
    for entry in LEXICON_SEED:
        key = (entry["local_term"], entry["language"])
        if key in existing:
            continue
        db.add(SymptomLexicon(**entry))
        inserted += 1
    if inserted:
        db.commit()
    return inserted


def seed_admin(db: "Session") -> bool:
    """Create the bootstrap administrator account if it does not exist.

    Returns True if a new admin was created.
    """
    from sqlalchemy import select

    from .config import settings
    from .models import User
    from .security import hash_password

    email = settings.admin_email.strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        return False
    db.add(
        User(
            full_name="System Administrator",
            email=email,
            password_hash=hash_password(settings.admin_password),
            role="admin",
        )
    )
    db.commit()
    return True


def seed_mho(db: "Session") -> bool:
    """Create the bootstrap MHO account if it does not exist.

    Returns True if a new MHO user was created.
    """
    from sqlalchemy import select

    from .config import settings
    from .models import User
    from .security import hash_password

    email = settings.mho_email.strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        return False
    db.add(
        User(
            full_name="Municipal Health Officer",
            email=email,
            password_hash=hash_password(settings.mho_password),
            role="mho",
        )
    )
    db.commit()
    return True
