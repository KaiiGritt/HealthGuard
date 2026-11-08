"""Email helpers for authentication and account notifications."""
from __future__ import annotations

import smtplib
import json
import base64
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from email.message import EmailMessage
from email.utils import formataddr

from .config import settings
from .email_templates import (
    password_reset_email_html,
    password_reset_email_text,
    verification_email_html,
    verification_email_text,
)


def _normalize_display_name(name: str | None) -> str:
    cleaned = (name or "HealthGuard").strip() or "HealthGuard"
    if cleaned.lower() == "healthguard":
        return "HealthGuard"
    return cleaned


def _from_header() -> str:
    """Sender shown in the inbox — use the app name, not a personal name."""
    if settings.smtp_enabled:
        address = settings.smtp_from_email or settings.smtp_username or settings.admin_email
        name = _normalize_display_name(settings.smtp_from_name)
    elif settings.mailjet_api_key_public and settings.mailjet_api_key_private:
        address = settings.mailjet_from_email
        name = _normalize_display_name(settings.mailjet_from_name)
    else:
        address = settings.sendgrid_from_email or settings.smtp_from_email or settings.admin_email
        name = _normalize_display_name(settings.smtp_from_name)
    return formataddr((name, address))


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
    if settings.smtp_enabled:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
            if settings.smtp_host.lower().endswith("gmail.com") or settings.smtp_port == 587:
                client.starttls()
            if settings.smtp_username:
                client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
        return True
    if settings.mailjet_api_key_public and settings.mailjet_api_key_private:
        return _send_with_mailjet(message)
    if settings.resend_api_key:
        return _send_with_resend(message)
    if settings.sendgrid_api_key:
        return _send_with_sendgrid(message)
    return False


def _send_with_mailjet(message: EmailMessage) -> bool:
    """Send email through Mailjet's HTTPS API."""
    if not settings.mailjet_from_email:
        raise RuntimeError("MAIL_FROM_EMAIL must be configured when using Mailjet.")

    plain_body = message.get_body(preferencelist=("plain",))
    html_body = message.get_body(preferencelist=("html",))
    display_name = _normalize_display_name(settings.mailjet_from_name)
    mailjet_message = {
        "From": {"Email": settings.mailjet_from_email, "Name": display_name},
        "To": [{"Email": message["To"]}],
        "Subject": message["Subject"],
    }
    if plain_body is not None:
        mailjet_message["TextPart"] = plain_body.get_content()
    if html_body is not None:
        mailjet_message["HTMLPart"] = html_body.get_content()

    credentials = f"{settings.mailjet_api_key_public}:{settings.mailjet_api_key_private}"
    authorization = base64.b64encode(credentials.encode("utf-8")).decode("ascii")
    request = Request(
        "https://api.mailjet.com/v3.1/send",
        data=json.dumps({"Messages": [mailjet_message]}).encode("utf-8"),
        headers={
            "Authorization": f"Basic {authorization}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Mailjet rejected email ({exc.code}): {detail}") from exc


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
