"""Reset a user's password hash to the current pbkdf2 format.

Use this when production accounts were seeded with legacy bcrypt hashes
(mysql_migration.sql) or when ADMIN_PASSWORD env changes do not apply to
existing users.

Examples (run from backend/):

    python scripts/reset_password.py acefin24@gmail.com "YourNewPassword!123"
    python scripts/reset_password.py healthguard.irosin@gmail.com "YourNewPassword!123"

Uses DATABASE_URL from backend/.env (or the environment).
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python scripts/reset_password.py <email> <new_password>")
        return 1

    email = sys.argv[1].strip().lower()
    new_password = sys.argv[2]
    if len(new_password) < 8:
        print("Error: password must be at least 8 characters.")
        return 1

    with SessionLocal() as db:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None:
            print(f"Error: no user found for {email}")
            return 1

        old_prefix = (user.password_hash or "")[:24]
        user.password_hash = hash_password(new_password)
        db.commit()
        print(f"Password updated for {email}.")
        print(f"  Old hash prefix: {old_prefix}...")
        print(f"  New hash prefix: {user.password_hash[:24]}...")
        if old_prefix.startswith("$2b$"):
            print("  Note: replaced legacy bcrypt hash with pbkdf2_sha256.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
