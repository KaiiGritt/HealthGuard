from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.database import Base  # noqa: E402
from app.models import Assessment, EmailVerification, SymptomLexicon, User  # noqa: E402


def build_server_url(database_url: str) -> str:
    url = make_url(database_url)
    if url.get_backend_name() != "mysql":
        raise ValueError(f"Expected a MySQL URL, got: {database_url}")

    database = url.database
    if not database:
        raise ValueError("Database name is missing from DATABASE_URL")

    return url.set(database=None).render_as_string(hide_password=False)


def main() -> None:
    database_url = settings.database_url
    print(f"[mysql] Using DATABASE_URL={database_url}")

    server_url = build_server_url(database_url)
    db_name = make_url(database_url).database

    server_engine = create_engine(server_url, future=True)
    with server_engine.begin() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
        conn.execute(text(f"USE `{db_name}`;"))

    engine = create_engine(database_url, future=True)
    Base.metadata.create_all(bind=engine)

    print(f"[mysql] Database `{db_name}` ensured and tables created.")


if __name__ == "__main__":
    main()
