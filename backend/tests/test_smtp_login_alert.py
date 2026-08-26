from __future__ import annotations

import unittest

from app.email import send_login_alert


class SmtpLoginAlertTests(unittest.TestCase):
    def test_send_login_alert_uses_branded_subject_and_body(self) -> None:
        message = send_login_alert("resident@example.com", "127.0.0.1")
        self.assertEqual(message["Subject"], "HealthGuard AI — Login alert")
        self.assertEqual(message["To"], "resident@example.com")
        self.assertIn("HealthGuard AI", message["From"])

        text_part = message.get_body(preferencelist=("plain",))
        text = text_part.get_content()  # type: ignore[union-attr]
        self.assertIn("resident@example.com", text)
        self.assertIn("127.0.0.1", text)

        html_part = message.get_body(preferencelist=("html",))
        self.assertIsNotNone(html_part)
        html = html_part.get_content()  # type: ignore[union-attr]
        self.assertIn("HealthGuard AI", html)
        self.assertNotIn("<img", html.lower())


if __name__ == "__main__":
    unittest.main()
