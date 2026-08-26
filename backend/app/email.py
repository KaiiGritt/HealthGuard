"""Email helpers for authentication and account notifications."""
from __future__ import annotations

import smtplib
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from email.message import EmailMessage
from email.utils import formataddr

from .config import settings
from .email_templates import (
    login_alert_email_html,
    login_alert_email_text,
    password_reset_email_html,
    password_reset_email_text,
    verification_email_html,
    verification_email_text,
)


def _from_header() -> str:
    """Sender shown in the inbox — use the app name, not a personal name."""
    address = settings.sendgrid_from_email or settings.smtp_from_email or settings.admin_email
    return formataddr((settings.smtp_from_name, address))


def _build_login_alert_message(email: str, ip_address: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = "HealthGuard — Login alert"
    msg["From"] = _from_header()
    msg["To"] = email
    msg.set_content(login_alert_email_text(email, ip_address))
    msg.add_alternative(login_alert_email_html(email, ip_address), subtype="html")
    return msg


def send_login_alert(email: str, ip_address: str | None = None) -> EmailMessage:
    """Build an email message for login notification."""
    return _build_login_alert_message(email, ip_address)


def send_verification_code(email: str, code: str) -> EmailMessage:
    """Build a branded verification email containing a one-time code."""
    msg = EmailMessage()
    msg["Subject"] = "HealthGuard — Verify your account"
    msg["From"] = _from_header()
    msg["To"] = email
    msg.set_content(verification_email_text(code))
    msg.add_alternative(verification_email_html(code), subtype="html")
    return msg


def send_password_reset_code(email: str, code: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = "HealthGuard — Reset your password"
    msg["From"] = _from_header()
    msg["To"] = email
    msg.set_content(password_reset_email_text(code))
    msg.add_alternative(password_reset_email_html(code), subtype="html")
    return msg


def send_message(message: EmailMessage) -> bool:
    """Send an email message using the configured HTTPS provider or SMTP."""
    if settings.sendgrid_api_key:
        return _send_with_sendgrid(message)
    if settings.resend_api_key:
        return _send_with_resend(message)
    if not settings.smtp_enabled:
        return False

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        if settings.smtp_host.lower().endswith("gmail.com") or settings.smtp_port == 587:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
    return True


def _message_parts(message: EmailMessage) -> tuple[str, str]:
    body = message.get_body(preferencelist=("html", "plain"))
    if body is None:
        return "", "text/plain"
    return body.get_content(), body.get_content_type()


def _send_with_sendgrid(message: EmailMessage) -> bool:
    body, content_type = _message_parts(message)
    content = [{"type": content_type, "value": body}]
    payload = {
        "personalizations": [{"to": [{"email": message["To"]}]}],
        "from": {"email": settings.sendgrid_from_email},
        "subject": message["Subject"],
        "content": content,
    }
    request = Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.sendgrid_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"SendGrid rejected email ({exc.code}): {detail}") from exc


def _send_with_resend(message: EmailMessage) -> bool:
    """Send email over HTTPS, which works on hosts that block outbound SMTP."""
    body = message.get_body(preferencelist=("html", "plain"))
    payload = {
        "from": settings.resend_from_email,
        "to": [message["To"]],
        "subject": message["Subject"],
    }
    if body is not None and body.get_content_type() == "text/html":
        payload["html"] = body.get_content()
    else:
        payload["text"] = body.get_content() if body is not None else ""
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend rejected email ({exc.code}): {detail}") from exc
