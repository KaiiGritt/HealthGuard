from __future__ import annotations

import unittest

from app.email import send_verification_code


class EmailVerificationTests(unittest.TestCase):
    def test_send_verification_code_includes_code_and_branded_content(self) -> None:
        message = send_verification_code("resident@example.com", "123456")
        self.assertEqual(message["Subject"], "HealthGuard AI — Verify your account")
        self.assertIn("resident@example.com", message["To"])
        self.assertIn("HealthGuard AI", message["From"])

        text_part = message.get_body(preferencelist=("plain",))
        text = text_part.get_content()  # type: ignore[union-attr]
        self.assertIn("123456", text)

        html_part = message.get_body(preferencelist=("html",))
        self.assertIsNotNone(html_part)
        html = html_part.get_content()  # type: ignore[union-attr]
        self.assertIn("123456", html)
        self.assertIn("HealthGuard AI", html)
        self.assertNotIn("<img", html.lower())


if __name__ == "__main__":
    unittest.main()
