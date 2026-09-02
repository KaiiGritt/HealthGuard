"""Create local-only demo accounts for manually testing each application role.

Run from backend/ with the default SQLite development database:
    python scripts/seed_demo_users.py
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import inspect, select, text

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import User
from app.security import hash_password

DEMO_USERS = (
    {
        "full_name": "Demo Administrator",
        "email": "demo.admin@localhost",
        "password": "DemoAdmin!123",
        "role": "admin",
    },
    {
        "full_name": "Demo Municipal Health Officer",
        "email": "demo.mho@localhost",
        "password": "DemoMHO!123",
        "role": "mho",
    },
    {
        "full_name": "Demo Resident",
        "email": "demo.user@localhost",
        "password": "DemoUser!123",
        "role": "resident",
        "age": 30,
        "sex": "female",
        "barangay": "San Julian",
        "phone_number": "09171234567",
    },
)


def migrate_local_users_table() -> None:
    """Bring the bundled development database up to the current user shape."""
    columns = {column["name"] for column in inspect(engine).get_columns("users")}
    additions = {
        "phone_number": "VARCHAR(32)",
        "language_preference": "VARCHAR(16)",
        "notification_preferences": "JSON",
        "is_deleted": "BOOLEAN NOT NULL DEFAULT 0",
        "deleted_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))


def main() -> None:
    if engine.url.get_backend_name() != "sqlite":
        raise SystemExit("Refusing to seed demo users: this script is for the local SQLite database only.")

    Base.metadata.create_all(bind=engine)
    migrate_local_users_table()
    created = 0
    with SessionLocal() as db:
        for demo_user in DEMO_USERS:
            existing = db.execute(select(User).where(User.email == demo_user["email"])).scalar_one_or_none()
            if existing is not None:
                continue
            values = {key: value for key, value in demo_user.items() if key != "password"}
            values["password_hash"] = hash_password(demo_user["password"])
            db.add(User(**values))
            created += 1
        db.commit()

    print(f"Created {created} demo user(s). Existing demo users were left unchanged.")
    print("\nLocal demo credentials:")
    for demo_user in DEMO_USERS:
        print(f"{demo_user['role']:8} {demo_user['email']} / {demo_user['password']}")


if __name__ == "__main__":
    main()
