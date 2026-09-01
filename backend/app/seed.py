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
    {"medical_term": "fever", "local_term": "may lagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "lumagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    # --- cough ---
    {"medical_term": "cough", "local_term": "cough", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "may ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "nakakaubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    # --- headache ---
    {"medical_term": "headache", "local_term": "headache", "language": "en", "severity_weight": 1, "category": "neurological"},
    {"medical_term": "headache", "local_term": "sakit ng ulo", "language": "tl", "severity_weight": 1, "category": "neurological"},
    {"medical_term": "headache", "local_term": "masakit ang ulo", "language": "tl", "severity_weight": 1, "category": "neurological"},
    {"medical_term": "headache", "local_term": "sakit ulo", "language": "tl", "severity_weight": 1, "category": "neurological"},
    # --- abdominal pain ---
    {"medical_term": "abdominal pain", "local_term": "abdominal pain", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "sakit ng tiyan", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "masakit ang tiyan", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "sakit sa tiyan", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "stomach ache", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    # --- vomiting ---
    {"medical_term": "vomiting", "local_term": "vomiting", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "pagsusuka", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "nagsusuka", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "sumusuka", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "sumuka", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    # --- diarrhea ---
    {"medical_term": "diarrhea", "local_term": "diarrhea", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "pagtatae", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "may pagtatae", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    # --- chest pain ---
    {"medical_term": "chest pain", "local_term": "chest pain", "language": "en", "severity_weight": 4, "category": "cardiovascular"},
    {"medical_term": "chest pain", "local_term": "sakit sa dibdib", "language": "tl", "severity_weight": 4, "category": "cardiovascular"},
    {"medical_term": "chest pain", "local_term": "masakit ang dibdib", "language": "tl", "severity_weight": 4, "category": "cardiovascular"},
    # --- difficulty breathing (high severity) ---
    {"medical_term": "difficulty breathing", "local_term": "difficulty breathing", "language": "en", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "shortness of breath", "language": "en", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hirap huminga", "language": "tl", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "nahihirapang huminga", "language": "tl", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hindi makahinga", "language": "tl", "severity_weight": 4, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "sumisikip ang paghinga", "language": "tl", "severity_weight": 4, "category": "respiratory"},
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


def seed_symptoms(db: Session) -> int:
    """Seed the canonical symptom registry used by the class diagram."""
    from sqlalchemy import select

    from .models import Symptom

    inserted = 0
    for name in SELECTABLE_SYMPTOMS:
        existing = db.execute(select(Symptom).where(Symptom.name == name)).scalar_one_or_none()
        if existing is None:
            db.add(Symptom(name=name, description=name, category="general", is_active=True))
            inserted += 1
    if inserted:
        db.commit()
    return inserted


def seed_risk_and_guide_levels(db: Session) -> None:
    """Seed the triage and guidance tables used by the class diagram."""
    from sqlalchemy import select

    from .models import GuideLevel, RiskLevel

    risk_levels = [
        ("GREEN", "Mild symptoms requiring monitoring and general advice.", 1),
        ("YELLOW", "Moderate symptoms requiring health worker review.", 2),
        ("RED", "Emergency-level symptoms requiring immediate escalation.", 3),
    ]
    for name, description, order in risk_levels:
        existing = db.execute(select(RiskLevel).where(RiskLevel.name == name)).scalar_one_or_none()
        if existing is None:
            db.add(RiskLevel(name=name, description=description, display_order=order))

    guide_levels = [
        ("general", "Standard self-care and mild symptom support.", 1),
        ("follow_up", "Follow-up guidance for yellow-tier cases.", 2),
    ]
    for name, description, order in guide_levels:
        existing = db.execute(select(GuideLevel).where(GuideLevel.guide_name == name)).scalar_one_or_none()
        if existing is None:
            db.add(GuideLevel(guide_name=name, description=description, display_order=order))

    db.commit()


def seed_lexicon_rules(db: Session) -> None:
    """Seed the rule metadata used by the medication generation model."""
    from sqlalchemy import select

    from .models import GuideLevel, LexiconRule, LexiconRuleBase, RiskLevel

    base = db.execute(
        select(LexiconRuleBase).where(LexiconRuleBase.name == "default_rule_base")
    ).scalar_one_or_none()
    if base is None:
        base = LexiconRuleBase(
            name="default_rule_base",
            description="Default rule base for symptom mappings and escalation thresholds.",
            version="1.0",
        )
        db.add(base)
        db.flush()

    rules = [
        ("fever", "fever", "GREEN", "general", 1.0),
        ("fever", "fever", "YELLOW", "follow_up", 1.2),
        ("cough", "cough", "GREEN", "general", 0.8),
        ("cough", "cough", "YELLOW", "follow_up", 1.0),
        ("difficulty breathing", "difficulty breathing", "RED", None, 5.0),
    ]

    for term, normalized_term, risk_name, guide_name, weight in rules:
        risk = db.execute(select(RiskLevel).where(RiskLevel.name == risk_name)).scalar_one_or_none() if risk_name else None
        guide = db.execute(select(GuideLevel).where(GuideLevel.guide_name == guide_name)).scalar_one_or_none() if guide_name else None
        matches = db.execute(
            select(LexiconRule).where(LexiconRule.term == term, LexiconRule.normalized_term == normalized_term)
        ).scalars().all()

        existing = matches[0] if matches else None
        if existing is None:
            db.add(
                LexiconRule(
                    term=term,
                    normalized_term=normalized_term,
                    risk_level_id=risk.id if risk else None,
                    guide_level_id=guide.id if guide else None,
                    weight=weight,
                    is_active=True,
                    rule_base_id=base.id,
                )
            )
            continue

        existing.rule_base_id = base.id
        existing.risk_level_id = risk.id if risk else existing.risk_level_id
        existing.guide_level_id = guide.id if guide else existing.guide_level_id
        existing.weight = weight
        existing.is_active = True

        for duplicate in matches[1:]:
            db.delete(duplicate)

    db.commit()


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
