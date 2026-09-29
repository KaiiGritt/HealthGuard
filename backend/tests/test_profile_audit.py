from __future__ import annotations

import json
import unittest
from datetime import date
from unittest.mock import MagicMock

from app.routers.auth import _add_profile_audit


class ProfileAuditTests(unittest.TestCase):
    def test_serializes_date_values_in_profile_changes(self) -> None:
        db = MagicMock()

        _add_profile_audit(
            db,
            1,
            "profile_update",
            date_of_birth={"from": date(1990, 1, 2), "to": date(1991, 3, 4)},
        )

        audit_entry = db.add.call_args.args[0]
        self.assertEqual(
            json.loads(audit_entry.details),
            {"date_of_birth": {"from": "1990-01-02", "to": "1991-03-04"}},
        )


if __name__ == "__main__":
    unittest.main()