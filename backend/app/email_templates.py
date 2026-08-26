"""Branded HTML email templates for HealthGuard AI (no images or profile photos)."""
from __future__ import annotations

from html import escape


def _shell(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f4ec;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.7;color:#182619;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f4ec;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8ded1;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="background:#2f6b4f;padding:20px 24px;">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#cfe3d6;">HealthGuard AI</div>
              <div style="margin-top:6px;font-size:22px;line-height:1.3;color:#f1f4ec;font-family:Georgia,'Times New Roman',serif;">{escape(title)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:18px;line-height:1.7;color:#3f4a3b;">
              {body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #e2e8d5;font-size:12px;line-height:1.5;color:#7c8a76;">
              This message was sent by HealthGuard AI for Irosin, Sorsogon.<br />
              It is not a medical diagnosis. For urgent concerns, contact your barangay health worker or RHU.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def verification_email_html(code: str) -> str:
    body = f"""
      <p style="margin:0 0 16px;">Thank you for registering. Enter this verification code in the app to activate your account:</p>
      <div style="margin:20px 0;padding:16px 20px;background:#f3f7eb;border:1px solid #d8ded1;border-radius:4px;text-align:center;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#7c8a76;">Verification code</div>
        <div style="margin-top:10px;font-size:36px;letter-spacing:0.28em;font-weight:700;color:#1f4a36;font-family:Consolas,Monaco,monospace;">{escape(code)}</div>
      </div>
      <p style="margin:0;">This code expires in <strong>10 minutes</strong>. If you did not create an account, you can ignore this email.</p>
    """
    return _shell("Confirm your email", body)


def verification_email_text(code: str) -> str:
    return "\n".join(
        [
            "HealthGuard AI — Confirm your email",
            "",
            "Thank you for registering.",
            "",
            f"Your verification code is: {code}",
            "",
            "Enter this code in the app to activate your account.",
            "This code expires in 10 minutes.",
            "",
            "If you did not create an account, you can ignore this email.",
        ]
    )


def login_alert_email_html(email: str, ip_address: str | None) -> str:
    ip = escape(ip_address or "unknown")
    account = escape(email)
    body = f"""
      <p style="margin:0 0 16px;">A successful sign-in was detected for your HealthGuard AI account.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:#f1f4ec;border:1px solid #d8ded1;border-radius:4px;">
        <tr><td style="padding:12px 16px;font-size:14px;"><strong>Account:</strong> {account}</td></tr>
        <tr><td style="padding:0 16px 12px;font-size:14px;"><strong>IP address:</strong> {ip}</td></tr>
      </table>
      <p style="margin:0;">If this was not you, change your password and contact your administrator immediately.</p>
    """
    return _shell("Login alert", body)


def login_alert_email_text(email: str, ip_address: str | None) -> str:
    return "\n".join(
        [
            "HealthGuard AI — Login alert",
            "",
            "A successful login was detected for your HealthGuard AI account.",
            f"Email: {email}",
            f"IP address: {ip_address or 'unknown'}",
            "",
            "If this was not you, please contact your administrator immediately.",
        ]
    )
