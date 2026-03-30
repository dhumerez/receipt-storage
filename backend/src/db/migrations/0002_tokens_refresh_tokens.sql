-- Phase 2: tokens table (invite + password_reset unified)
-- FR-02.7 invite flow; FR-02.8 password reset flow
-- token_hash = SHA-256(rawToken) — raw token never stored in DB

DO $$ BEGIN
  CREATE TYPE token_type AS ENUM ('invite', 'password_reset');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash varchar(255) NOT NULL,
  type token_type NOT NULL,
  email varchar(255) NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES users(id),
  role user_role,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tokens_token_hash ON tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_email_type ON tokens(email, type);

-- Phase 2: refresh_tokens table
-- Rotate on each /api/auth/refresh call; revoke on logout and password reset
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
