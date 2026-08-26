"""Email helpers for authentication and account notifications."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from .config import settings
from .email_templates import (
    login_alert_email_html,
    login_alert_email_text,
    verification_email_html,
    verification_email_text,
)


def _from_header() -> str:
    """Sender shown in the inbox — use the app name, not a personal name."""
    address = settings.smtp_from_email or settings.admin_email
    return formataddr((settings.smtp_from_name, address))


def _build_login_alert_message(email: str, ip_address: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = "HealthGuard AI — Login alert"
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
    msg["Subject"] = "HealthGuard AI — Verify your account"
    msg["From"] = _from_header()
    msg["To"] = email
    msg.set_content(verification_email_text(code))
    msg.add_alternative(verification_email_html(code), subtype="html")
    return msg


def send_message(message: EmailMessage) -> bool:
    """Send an email message over SMTP using configured settings."""
    if not settings.smtp_enabled:
        return False

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        if settings.smtp_host.lower().endswith("gmail.com") or settings.smtp_port == 587:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
    return True
