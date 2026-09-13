from __future__ import annotations

import unittest

from app.security import hash_password, validate_password_policy, verify_password


class PasswordPolicyTests(unittest.TestCase):
    def assertRejected(self, password: str, *identifiers: str) -> None:
        with self.assertRaises(ValueError):
            validate_password_policy(password, identifiers)

    def test_accepts_strong_long_passphrase(self) -> None:
        password = "Correct-Horse-Battery-Staple!2026"
        self.assertEqual(validate_password_policy(password, ("Jane Resident", "jane@example.com")), password)

    def test_rejects_missing_requirements(self) -> None:
        for password in ("12345678", "abcdefgh", "ABCDEFGH", "Abcdefgh", "Abcdefg!"):
            self.assertRejected(password)

    def test_rejects_common_passwords(self) -> None:
        for password in ("Password123!", "Qwerty123!", "Admin123!"):
            self.assertRejected(password)

    def test_rejects_repeated_and_sequential_patterns(self) -> None:
        self.assertRejected("Aaaaaaaaa1!")
        self.assertRejected("123456789012Aa!")
        self.assertRejected("Abcdefghijklm1!")

    def test_rejects_account_identifiers(self) -> None:
        self.assertRejected("JaneResident!2026", "Jane Resident", "jane@example.com")
        self.assertRejected("Jane@example.com!1A", "Jane Resident", "jane@example.com")

    def test_hash_does_not_store_plaintext(self) -> None:
        password = "Secure!Pass123"
        stored = hash_password(password)
        self.assertNotIn(password, stored)
        self.assertTrue(verify_password(password, stored))
        self.assertFalse(verify_password("Wrong!Pass123", stored))


if __name__ == "__main__":
    unittest.main()