-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read valid tokens (needed for password reset page)
CREATE POLICY "Anyone can read valid tokens" ON password_reset_tokens
  FOR SELECT
  USING (expires_at > NOW() AND used = false);

-- Policy: Service role can do anything
CREATE POLICY "Service role can manage tokens" ON password_reset_tokens
  FOR ALL
  USING (true);