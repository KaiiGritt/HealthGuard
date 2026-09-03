"""SQLAlchemy engine, session factory, and FastAPI DB dependency."""
from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import BACKEND_DIR, settings


def _normalize_sqlite_url(database_url: str) -> str:
    if not database_url.startswith("sqlite"):
        return database_url

    parsed = make_url(database_url)
    if parsed.get_backend_name() != "sqlite":
        return database_url

    db_name = parsed.database
    if not db_name or db_name in {":memory:", ""}:
        return database_url

    db_path = Path(db_name)
    if db_path.is_absolute():
        return f"sqlite:///{db_path.as_posix()}"

    normalized_path = (BACKEND_DIR / db_path).resolve()
    return f"sqlite:///{normalized_path.as_posix()}"


def _build_engine(database_url: str):
    normalized_url = _normalize_sqlite_url(database_url)

    if normalized_url.startswith("mysql"):
        try:
            engine = create_engine(normalized_url, pool_pre_ping=True, future=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine
        except Exception as exc:
            print(f"[db] MySQL unavailable ({exc}). Falling back to SQLite at ./healthguard.db")
            normalized_url = _normalize_sqlite_url("sqlite:///./healthguard.db")

    if normalized_url.startswith("sqlite"):
        return create_engine(
            normalized_url,
            future=True,
            connect_args={"check_same_thread": False},
        )

    return create_engine(normalized_url, pool_pre_ping=True, future=True)


engine = _build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Base class for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_email_verification_schema() -> None:
    """Ensure email_verifications stores pending registration fields."""
    from sqlalchemy import inspect, text

    from .models import EmailVerification

    insp = inspect(engine)
    if "email_verifications" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("email_verifications")}
    needed = {"full_name", "password_hash", "age", "sex", "barangay"}
    if needed.issubset(cols):
        # Some older schemas also need phone_number for registration and profile flows.
        if "phone_number" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE email_verifications ADD COLUMN phone_number VARCHAR(32)"))
        return

    if engine.url.get_backend_name() == "sqlite":
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS email_verifications"))
        EmailVerification.__table__.create(bind=engine)
        return

    alters = {
        "full_name": "VARCHAR(128) NOT NULL DEFAULT ''",
        "password_hash": "VARCHAR(255) NOT NULL DEFAULT ''",
        "age": "INTEGER",
        "sex": "VARCHAR(16)",
        "barangay": "VARCHAR(96)",
        "phone_number": "VARCHAR(32)",
    }
    with engine.begin() as conn:
        for column, ddl in alters.items():
            if column not in cols:
                conn.execute(text(f"ALTER TABLE email_verifications ADD COLUMN {column} {ddl}"))

def migrate_assessment_handled_schema() -> None:
    """Add the persisted MHO handled timestamp to existing assessment databases."""
    from sqlalchemy import inspect, text

    if "assessments" not in inspect(engine).get_table_names():
        return
    columns = {column["name"] for column in inspect(engine).get_columns("assessments")}
    if "handled_at" not in columns:
        handled_at_type = "DATETIME" if engine.url.get_backend_name() in {"sqlite", "mysql"} else "TIMESTAMP WITH TIME ZONE"
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE assessments ADD COLUMN handled_at {handled_at_type}"))



def migrate_lexicon_review_schema() -> None:
    """Add review metadata to existing lexicon tables without losing entries."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "symptom_lexicon" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("symptom_lexicon")}
    alters = {
        "reviewed": "BOOLEAN NOT NULL DEFAULT FALSE",
        "reviewed_by": "VARCHAR(191)",
        "reviewed_at": "TIMESTAMP",
    }
    with engine.begin() as conn:
        for column, ddl in alters.items():
            if column not in cols:
                conn.execute(text(f"ALTER TABLE symptom_lexicon ADD COLUMN {column} {ddl}"))


def migrate_user_preferences_schema() -> None:
    """Add preference and soft-delete metadata to legacy user records."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("users")}
    alters = {
        "language_preference": "VARCHAR(16)",
        "notification_preferences": "JSON",
        "phone_number": "VARCHAR(32)",
        "is_deleted": "BOOLEAN NOT NULL DEFAULT FALSE",
        "deleted_at": "TIMESTAMP",
    }
    with engine.begin() as conn:
        for column, ddl in alters.items():
            if column not in cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} {ddl}"))


def migrate_user_role_schema() -> None:
    """Add the role column required by authentication and authorization."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return

    columns = {column["name"] for column in insp.get_columns("users")}
    if "role" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'resident'"))


def migrate_assessment_rules_schema() -> None:
    """Add stored rule explanations to existing assessment records."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "assessments" not in insp.get_table_names():
        return

    columns = {column["name"] for column in insp.get_columns("assessments")}
    if "triggered_rules" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE assessments ADD COLUMN triggered_rules JSON"))


def migrate_lexicon_rule_base_schema() -> None:
    """Add rule_base_id to legacy lexicon_rules tables created before the diagram refactor."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "lexicon_rules" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("lexicon_rules")}
    if "rule_base_id" in cols:
        return

    if engine.url.get_backend_name() == "sqlite":
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE lexicon_rules ADD COLUMN rule_base_id INTEGER"))
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE lexicon_rules ADD COLUMN rule_base_id INTEGER "
                "REFERENCES lexicon_rule_bases(id) ON DELETE SET NULL"
            )
        )
