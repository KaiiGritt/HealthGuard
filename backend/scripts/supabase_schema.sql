-- HealthGuard Supabase schema bootstrap
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    age INTEGER NULL,
    sex VARCHAR(16) NULL,
    barangay VARCHAR(96) NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'resident',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    code VARCHAR(16) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER NULL,
    sex VARCHAR(16) NULL,
    barangay VARCHAR(96) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    code VARCHAR(16) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

CREATE TABLE IF NOT EXISTS symptom_lexicon (
    id SERIAL PRIMARY KEY,
    local_term VARCHAR(128) NOT NULL,
    language VARCHAR(8) NOT NULL,
    medical_term VARCHAR(128) NOT NULL,
    severity_weight INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(64) NOT NULL DEFAULT 'general',
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by VARCHAR(191) NULL,
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_symptom_lexicon_local_term ON symptom_lexicon(local_term);
CREATE INDEX IF NOT EXISTS idx_symptom_lexicon_medical_term ON symptom_lexicon(medical_term);

CREATE TABLE IF NOT EXISTS risk_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(16) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_levels (
    id SERIAL PRIMARY KEY,
    guide_name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lexicon_rules (
    id SERIAL PRIMARY KEY,
    term VARCHAR(128) NOT NULL,
    normalized_term VARCHAR(128) NOT NULL,
    risk_level_id INTEGER NULL REFERENCES risk_levels(id) ON DELETE SET NULL,
    guide_level_id INTEGER NULL REFERENCES guide_levels(id) ON DELETE SET NULL,
    weight DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lexicon_rules_term ON lexicon_rules(term);
CREATE INDEX IF NOT EXISTS idx_lexicon_rules_normalized_term ON lexicon_rules(normalized_term);

CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL,
    input_text TEXT NOT NULL DEFAULT '',
    method VARCHAR(16) NOT NULL DEFAULT 'text',
    detected_symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level VARCHAR(8) NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    recommendation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_risk_level ON assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);

CREATE TABLE IF NOT EXISTS pre_medications (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    medication_name VARCHAR(128) NOT NULL DEFAULT '',
    dosage TEXT NOT NULL DEFAULT '',
    frequency VARCHAR(64) NOT NULL DEFAULT '',
    instruction TEXT NOT NULL DEFAULT '',
    caution TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_medications_assessment_id ON pre_medications(assessment_id);

INSERT INTO risk_levels (name, description, display_order)
VALUES
    ('GREEN', 'Mild symptoms requiring monitoring and general advice.', 1),
    ('YELLOW', 'Moderate symptoms requiring health worker review.', 2),
    ('RED', 'Emergency-level symptoms requiring immediate escalation.', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO guide_levels (guide_name, description, display_order)
VALUES
    ('general', 'Standard self-care and mild symptom support.', 1),
    ('follow_up', 'Follow-up guidance for yellow-tier cases.', 2)
ON CONFLICT (guide_name) DO NOTHING;

INSERT INTO lexicon_rules (term, normalized_term, risk_level_id, guide_level_id, weight, is_active)
SELECT term, normalized_term, rl.id, gl.id, weight, true
FROM (
    VALUES
        ('fever', 'fever', 'GREEN', 'general', 1.0),
        ('fever', 'fever', 'YELLOW', 'follow_up', 1.2),
        ('cough', 'cough', 'GREEN', 'general', 0.8),
        ('cough', 'cough', 'YELLOW', 'follow_up', 1.0),
        ('difficulty breathing', 'difficulty breathing', 'RED', NULL, 5.0)
) AS v(term, normalized_term, risk_name, guide_name, weight)
LEFT JOIN risk_levels rl ON rl.name = v.risk_name
LEFT JOIN guide_levels gl ON gl.guide_name = v.guide_name
ON CONFLICT DO NOTHING;

-- Optional: seed some example symptom lexicon rows if you want the app to work immediately
INSERT INTO symptom_lexicon (local_term, language, medical_term, severity_weight, category)
VALUES
    ('fever', 'en', 'fever', 2, 'general'),
    ('lagnat', 'tl', 'fever', 2, 'general'),
    ('cough', 'en', 'cough', 1, 'respiratory'),
    ('ubo', 'tl', 'cough', 1, 'respiratory'),
    ('difficulty breathing', 'en', 'difficulty breathing', 4, 'respiratory'),
    ('hirap huminga', 'tl', 'difficulty breathing', 4, 'respiratory')
ON CONFLICT DO NOTHING;
