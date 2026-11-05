# HealthGuard AI — Backend (FastAPI)

Three-tier backend: **Next.js → FastAPI → PostgreSQL/MySQL**. Rule-based bilingual NLP triage
(NLTK + custom two-layer lexicon). The `scispaCy` biomedical layer is optional and dormant
by default (no wheels for Python 3.14).

## One-time setup

### 1. Choose a database

For local development, the backend defaults to SQLite. For production, Supabase is
recommended. In the Supabase dashboard, open **Connect**, choose the **Session pooler**
and **SQLAlchemy**, then copy the URI.

If you prefer a local database, install MySQL Community Server (MSI installer) or XAMPP,
start the server, then create the DB:

```sql
CREATE DATABASE healthguard CHARACTER SET utf8mb4;
```

### 2. Configure the connection
Copy `.env.example` to `.env` and set your credentials. For Supabase, use the URI copied
from the dashboard, for example:

```
DATABASE_URL=postgresql+psycopg://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
CORS_ORIGINS=http://localhost:3000
```

Keep the password URL-encoded if it contains characters such as `@`, `:`, `/`, or `#`.
The backend creates its tables and seeds the lexicon on startup. Existing SQLite data is
not copied automatically; export/import it separately if needed.

Render free services may block outbound SMTP connections. For deployed email delivery,
use Resend over HTTPS instead of SMTP:

```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Verify a sender/domain in Resend before using a custom `RESEND_FROM_EMAIL`. The default
Resend sender is intended for initial testing and may only deliver to the account email.
SMTP is used whenever `SMTP_ENABLED=true`, ahead of Resend and SendGrid. For Gmail, use
an app password (not your regular account password) and configure these values in
`backend/.env`:

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-sender@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=your-sender@gmail.com
```

Keep the app password private. Restart the backend after changing `.env`.

### 3. Python environment
```bash
py -m venv .venv
.\.venv\Scripts\activate          # PowerShell / cmd
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- On startup the app creates tables, downloads NLTK `punkt`, and seeds the lexicon (idempotent).

### Local demo accounts

To create disposable accounts for checking the admin, MHO, and resident views, run this
from `backend/`. The script only runs against the local SQLite database and is idempotent:

```bash
DATABASE_URL=sqlite:///./healthguard.db python scripts/seed_demo_users.py
```

In PowerShell, set it for the current terminal first:

```powershell
$env:DATABASE_URL = "sqlite:///./healthguard.db"
python scripts/seed_demo_users.py
uvicorn app.main:app --reload --port 8000
```

It prints the credentials for `admin`, `mho`, and `resident` accounts. These accounts are
not created automatically and the script refuses non-SQLite databases.

## Test the engine without a database

```bash
python run_engine_smoketest.py
```

Runs the full NLP + rule pipeline against representative English/Tagalog inputs and asserts
the expected Green/Yellow/Red outcomes.

## Activating the optional scispaCy entity matcher
scispaCy needs Python 3.11/3.12. Install the optional dependencies and model into the
Python environment used to run the backend:

```powershell
py -3.12 -m pip install -r requirements-scispacy.txt
```

When the model is loadable, recognized biomedical entity phrases are matched against
existing symptom lexicon entries after English lemmatization. Only matched lexicon entries
are passed to the existing triage rules; unmatched entities are ignored. scispaCy does
not supply severity, diagnoses, or recommendations. Without the model, the existing
lexicon and triage flow continues unchanged. The small model is English-focused and does
not perform synonym/concept linking; only inflected phrases whose lemma matches an
existing lexicon entry can add a match. Restart the backend after installation.
