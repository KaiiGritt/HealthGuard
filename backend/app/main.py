"""HealthGuard — FastAPI application entrypoint.

On startup: ensures NLTK data is present, creates tables, and seeds the lexicon.
Run from the backend/ directory:  uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine, migrate_email_verification_schema, migrate_lexicon_review_schema
from .nlp import scispacy_adapter
from .routers import assessment, auth
from .seed import seed_admin, seed_lexicon, seed_lexicon_rules, seed_mho, seed_risk_and_guide_levels, seed_symptoms


def _ensure_nltk() -> None:
    """Download the 'punkt' tokenizer models if missing (best-effort)."""
    try:
        import nltk

        for pkg in ("punkt", "punkt_tab"):
            try:
                nltk.data.find(f"tokenizers/{pkg}")
            except LookupError:
                nltk.download(pkg, quiet=True)
    except Exception:
        # Tokenizer has a regex fallback, so this is non-fatal.
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_nltk()
    Base.metadata.create_all(bind=engine)
    migrate_email_verification_schema()
    migrate_lexicon_review_schema()
    with SessionLocal() as db:
        inserted = seed_lexicon(db)
        symptoms_inserted = seed_symptoms(db)
        seed_risk_and_guide_levels(db)
        seed_lexicon_rules(db)
        admin_created = seed_admin(db)
        mho_created = seed_mho(db)
    print(f"[startup] Lexicon seeded (+{inserted} new entries). "
          f"Symptoms seeded (+{symptoms_inserted} new entries). "
          f"scispaCy layer: {'ACTIVE' if scispacy_adapter.is_available() else 'dormant'}.")
    if admin_created:
        print(f"[startup] Bootstrap admin created: {settings.admin_email} "
              f"(password from ADMIN_PASSWORD env — CHANGE IT).")
    if mho_created:
        print(f"[startup] Bootstrap MHO created: {settings.mho_email} "
              f"(password from MHO_PASSWORD env — CHANGE IT).")
    yield


app = FastAPI(title="HealthGuard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assessment.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "scispacy": scispacy_adapter.is_available()}
