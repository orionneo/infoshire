-- Create email configuration table
CREATE TABLE IF NOT EXISTS email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL DEFAULT 'smtp-mail.outlook.com',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT false, -- false = TLS/STARTTLS, true = SSL
  smtp_user TEXT NOT NULL, -- Email address
  from_name TEXT NOT NULL, -- Display name for sender
  from_email TEXT NOT NULL, -- From email address (usually same as smtp_user)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view email config
CREATE POLICY "Admins can view email config"
  ON email_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert email config
CREATE POLICY "Admins can insert email config"
  ON email_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update email config
CREATE POLICY "Admins can update email config"
  ON email_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_email_config_updated_at();

-- Insert default Hotmail/Outlook configuration (placeholder)
INSERT INTO email_config (smtp_host, smtp_port, smtp_secure, smtp_user, from_name, from_email, is_active)
VALUES ('smtp-mail.outlook.com', 587, false, 'seu-email@hotmail.com', 'InfoShire Assistência Técnica', 'seu-email@hotmail.com', false)
ON CONFLICT DO NOTHING;