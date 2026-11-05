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

Render services may not be able to connect to external SMTP hosts. For deployed email
delivery, use an HTTPS email API instead. Mailjet is supported with its API key pair:

```env
SMTP_ENABLED=false
MJ_APIKEY_PUBLIC=your-mailjet-public-api-key
MJ_APIKEY_PRIVATE=your-mailjet-private-api-key
MAIL_FROM_EMAIL=verified-sender@your-domain.com
MAIL_FROM_NAME=HealthGuard
```

Create the API key pair in Mailjet and validate the sender address before sending.
Add these values to the Render backend service environment, then redeploy. The values in
your local `backend/.env` are not automatically copied to Render. When both Mailjet keys
are set, Mailjet is used ahead of Resend and SendGrid; SMTP is used first whenever
`SMTP_ENABLED=true`.

Resend is also supported over HTTPS:

```env
SMTP_ENABLED=false
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=verified-sender@your-domain.com
```

For local Gmail SMTP, use an app password (not your regular account password):

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
