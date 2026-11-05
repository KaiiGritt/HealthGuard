import base64
import json
from email.message import EmailMessage
from urllib.request import Request

from app import email
from app.config import settings
from app.routers.auth import _require_email_provider


def test_send_message_uses_mailjet_https_api(monkeypatch) -> None:
    monkeypatch.setattr(settings, "smtp_enabled", False)
    monkeypatch.setattr(settings, "mailjet_api_key_public", "public-key")
    monkeypatch.setattr(settings, "mailjet_api_key_private", "private-key")
    monkeypatch.setattr(settings, "mailjet_from_email", "verified@example.com")
    monkeypatch.setattr(settings, "mailjet_from_name", "HealthGuard")
    monkeypatch.setattr(settings, "resend_api_key", "")
    monkeypatch.setattr(settings, "sendgrid_api_key", "")
    captured: dict[str, object] = {}

    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

    def fake_urlopen(request: Request, timeout: int):
        captured["url"] = request.full_url
        captured["authorization"] = request.get_header("Authorization")
        captured["timeout"] = timeout
        captured["payload"] = json.loads(request.data.decode("utf-8"))
        return Response()

    monkeypatch.setattr(email, "urlopen", fake_urlopen)
    message = EmailMessage()
    message["To"] = "recipient@example.com"
    message["Subject"] = "Test"
    message.set_content("Plain text")
    message.add_alternative("<p>HTML</p>", subtype="html")

    assert email.send_message(message) is True
    assert captured["url"] == "https://api.mailjet.com/v3.1/send"
    credentials = base64.b64encode(b"public-key:private-key").decode("ascii")
    assert captured["authorization"] == f"Basic {credentials}"
    sent = captured["payload"]["Messages"][0]
    assert sent["From"] == {"Email": "verified@example.com", "Name": "HealthGuard"}
    assert sent["To"] == [{"Email": "recipient@example.com"}]
    assert sent["TextPart"] == "Plain text\n"
    assert sent["HTMLPart"] == "<p>HTML</p>\n"


def test_mailjet_requires_sender_address(monkeypatch) -> None:
    monkeypatch.setattr(settings, "mailjet_from_email", "")
    message = EmailMessage()
    message["To"] = "recipient@example.com"
    message["Subject"] = "Test"
    message.set_content("Plain text")

    try:
        email._send_with_mailjet(message)
    except RuntimeError as exc:
        assert "MAIL_FROM_EMAIL" in str(exc)
    else:
        raise AssertionError("Expected missing Mailjet sender to be rejected")


def test_mailjet_configuration_satisfies_email_provider_check(monkeypatch) -> None:
    monkeypatch.setattr(settings, "smtp_enabled", False)
    monkeypatch.setattr(settings, "mailjet_api_key_public", "public-key")
    monkeypatch.setattr(settings, "mailjet_api_key_private", "private-key")
    monkeypatch.setattr(settings, "mailjet_from_email", "verified@example.com")
    monkeypatch.setattr(settings, "resend_api_key", "")
    monkeypatch.setattr(settings, "sendgrid_api_key", "")

    _require_email_provider()
