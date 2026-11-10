# HealthGuard AI — Backend (FastAPI)

Three-tier backend: **Next.js → FastAPI → PostgreSQL/MySQL**. Rule-based bilingual NLP triage
uses NLTK, scispaCy, and the custom English–Tagalog/Bikol symptom lexicon. An additional
SPECIALIST layer reads the native NLM `LEXICON` file configured locally.
Use Python 3.11 or 3.12 for the required scispaCy model.

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
py -3.12 -m venv .venv
.\.venv\Scripts\activate          # PowerShell / cmd
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- On startup the app creates tables, downloads NLTK `punkt`, and seeds the lexicon (idempotent).

Assessment records include WHO ICD-10 (2019) code candidates for supported reported
symptoms where a direct symptom reference is available. All current mappings are marked
`pending_review`; reviewer and review date remain empty until a qualified clinician or
coding specialist completes review. Ambiguous terms remain uncoded with an explanation.
Each mapping includes a WHO source URL and standard/version. These candidates describe
reported symptoms or findings, are not diagnoses, and must not be used as approved
clinical codes before review. No local-authority endorsement is implied.

The mapping registry is maintained in `app/icd10.py`. Changes to codes, descriptions,
sources, and review metadata must be made through reviewed source-control changes so the
repository change history records who changed the mapping and when.

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

## NLP integrations: scispaCy and SPECIALIST Lexicon

The assessment pipeline uses scispaCy entity extraction, the NLTK/custom bilingual
symptom lexicon, and the rule engine. Use Python 3.11 or 3.12. scispaCy and its model
are included through `requirements.txt`:

```powershell
py -3.12 -m pip install -r requirements.txt
```

`SCISPACY_REQUIRED` defaults to `true`, so startup fails clearly if the model is
unavailable. Set it to `false` only for an intentional fallback environment. scispaCy
is English-focused; it does not supply severity, diagnoses, or recommendations. Its
entities can only match existing symptom lexicon entries.

Render currently defaults new services to Python 3.14, which is not supported by
these pinned SciPy/scispaCy dependencies. The repository's `.python-version` pins the
backend deployment to Python 3.12. If the Render service has a `PYTHON_VERSION`
environment variable set, change it to a supported full version such as `3.12.10`;
that setting takes precedence over `.python-version`. Trigger a new deploy after
updating the version.

The SPECIALIST adapter reads the native `LEXICON` file and uses base forms and spelling
variants only when the base form exactly matches an existing canonical symptom term.
It does not infer that a general synonym is a symptom or generate inflections from
`variants` flags; those require the associated lexical tools. Obtain the SPECIALIST
Lexicon from the
[NLM Lexicon project](https://lhncbc.nlm.nih.gov/LSG/Projects/lexicon/current/web/index.html)
and follow its [terms and conditions](https://lhncbc.nlm.nih.gov/LSG/Projects/lexicon/current/web/termsAndConditions.html).
NLM makes the tools available at no charge; attribution and redistribution conditions
still apply. Extract only the main `LEX/LEXICON` file from the downloaded archive,
keep it outside version control, and set `SPECIALIST_LEXICON_PATH` in `backend/.env`
or the deployment environment:

```env
SPECIALIST_LEXICON_PATH=C:/healthguard-local/LEXICON
```

### Enable SPECIALIST on the deployed backend

The path in your local `backend/.env` points to your computer and is not available to
Render or another hosting provider. To enable SPECIALIST in production, make the extracted
`LEXICON` file available to the backend service itself, then set
`SPECIALIST_LEXICON_PATH` in that service's environment to the file's deployed path. For
example, if the file is stored on a Render persistent disk mounted at `/var/data`, set:

```env
SPECIALIST_LEXICON_PATH=/var/data/LEXICON
```

Upload or provision the file on persistent storage so it remains available across
deployments; do not rely on a temporary filesystem or the path on your development
computer. Keep the source file out of Git and check the NLM terms before redistributing
it as part of a deployment. Redeploy/restart the backend after setting the variable.
When the path is unset, SPECIALIST matching stays inactive and the other assessment
layers continue to run. Confirm activation in the backend startup log and admin System
settings.

The adapter checks phrase boundaries and existing canonical terms, and applies the
existing negation handling. It never uses SPECIALIST entries to create new triage rules
or severity weights. A missing path leaves this layer inactive; a configured missing
or invalid file raises an explicit error. `/health` and admin System settings show
whether the integrations are active. Record the SPECIALIST release and attribution
used; keep the source data out of version control.
