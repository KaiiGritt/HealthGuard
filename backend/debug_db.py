from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.database_url)
with engine.connect() as conn:
    print('URL=', settings.database_url)
    print('TABLES=', conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).fetchall() if settings.database_url.startswith('postgres') else conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).fetchall())
    try:
        print('USERS=', conn.execute(text("SELECT id, full_name, email, role, barangay FROM users ORDER BY id DESC LIMIT 20")).fetchall())
    except Exception as exc:
        print('USERS_ERR=', type(exc).__name__, exc)
    try:
        print('ASSESSMENTS=', conn.execute(text("SELECT id, user_id, risk_level, input_text, created_at FROM assessments ORDER BY id DESC LIMIT 20")).fetchall())
    except Exception as exc:
        print('ASSESSMENTS_ERR=', type(exc).__name__, exc)
