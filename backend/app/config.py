"""Application settings loaded from environment / backend/.env."""
from __future__ import annotations

from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'healthguard.db').resolve()}"


class Settings(BaseSettings):
    # Default to a local SQLite file for development. Override in backend/.env for MySQL.
    database_url: str = DEFAULT_DATABASE_URL
    # Comma-separated list of allowed CORS origins (the Next.js frontend).
    cors_origins: str = "http://localhost:3000"

    # --- Auth ---
    # CHANGE in production via JWT_SECRET env var. Default is dev-only.
    jwt_secret: str = "dev-insecure-change-me-please-set-JWT_SECRET"
    jwt_expire_days: int = 7
    # Send the auth cookie only over HTTPS. Keep False for local http dev.
    cookie_secure: bool = False
    # Bootstrap staff credentials (seeded on startup if absent).
    admin_email: str = "acefin24@gmail.com"
    admin_password: str = "ChangeMe!123"
    mho_email: str = "healthguard.irosin@gmail.com"
    mho_password: str = "ChangeMe!123"
    # Optional SMTP settings for sending login alerts.
    smtp_enabled: bool = Field(default=False, validation_alias=AliasChoices("SMTP_ENABLED", "smtp_enabled"))
    smtp_host: str = Field(default="localhost", validation_alias=AliasChoices("SMTP_HOST", "smtp_host"))
    smtp_port: int = Field(default=25, validation_alias=AliasChoices("SMTP_PORT", "smtp_port"))
    smtp_username: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_USERNAME", "EMAIL_HOST_USER", "smtp_username"),
    )
    smtp_password: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_PASSWORD", "EMAIL_HOST_PASSWORD", "smtp_password"),
    )
    smtp_from_email: str = Field(default="", validation_alias=AliasChoices("SMTP_FROM_EMAIL", "smtp_from_email"))
    smtp_from_name: str = Field(
        default="HealthGuard AI",
        validation_alias=AliasChoices("SMTP_FROM_NAME", "smtp_from_name"),
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
