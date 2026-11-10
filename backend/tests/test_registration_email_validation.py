from __future__ import annotations

import unittest
from datetime import date

from pydantic import ValidationError

from app.schemas import RegisterRequest


class RegisterEmailValidationTests(unittest.TestCase):
    def make_payload(self, email: str) -> dict[str, object]:
        return {
            "full_name": "Jane Resident",
            "email": email,
            "password": "Vivid!Health72X",
            "date_of_birth": date(1995, 6, 15),
            "barangay": "Monbon",
            "phone_number": "09946206773",
        }

    def test_accepts_valid_email(self) -> None:
        payload = RegisterRequest(**self.make_payload("jane.doe+tag@example.com"))
        self.assertEqual(payload.email, "jane.doe+tag@example.com")

    def test_rejects_dot_before_at_sign(self) -> None:
        with self.assertRaises(ValidationError):
            RegisterRequest(**self.make_payload("test.@gmail.com"))

    def test_rejects_consecutive_local_part_dots(self) -> None:
        with self.assertRaises(ValidationError):
            RegisterRequest(**self.make_payload("jane..doe@example.com"))


if __name__ == "__main__":
    unittest.main()
