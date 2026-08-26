from __future__ import annotations

from pathlib import Path

from app.config import BACKEND_DIR, DEFAULT_DATABASE_URL
from app.database import _normalize_sqlite_url


def test_default_database_url_points_to_backend_db_file() -> None:
    db_path = Path(DEFAULT_DATABASE_URL.replace("sqlite:///", "", 1))
    assert db_path.is_absolute()
    assert db_path == (BACKEND_DIR / "healthguard.db").resolve()


def test_relative_sqlite_urls_are_resolved_to_backend_directory() -> None:
    normalized = _normalize_sqlite_url("sqlite:///./healthguard.db")
    assert normalized == f"sqlite:///{(BACKEND_DIR / 'healthguard.db').resolve()}"
