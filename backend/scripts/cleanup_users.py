"""Remove non-admin users and related data from the local SQLite database."""
from __future__ import annotations

import sqlite3
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND_DIR / "healthguard.db"


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    def dump(label: str) -> None:
        print(label)
        for table in ("users", "email_verifications", "assessments"):
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            print(f"  {table}: {len(rows)} row(s)")
            for row in rows:
                print(f"    {dict(row)}")

    dump("Before cleanup:")
    conn.execute(
        'DELETE FROM assessments WHERE user_id IN (SELECT id FROM users WHERE role != "admin")'
    )
    conn.execute("DELETE FROM assessments")
    conn.execute("DELETE FROM email_verifications")
    conn.execute('DELETE FROM users WHERE role != "admin"')
    conn.commit()
    try:
        conn.execute(
            'DELETE FROM sqlite_sequence WHERE name IN ("users", "assessments", "email_verifications")'
        )
        conn.commit()
    except sqlite3.OperationalError:
        pass
    dump("\nAfter cleanup:")
    conn.close()
    print("\nDone. Only the admin account remains.")


if __name__ == "__main__":
    main()
