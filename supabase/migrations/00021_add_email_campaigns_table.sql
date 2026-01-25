-- Create email_campaigns table to track promotional emails
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin can view all campaigns
CREATE POLICY "Admins can view all email campaigns"
  ON email_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can insert campaigns
CREATE POLICY "Admins can create email campaigns"
  ON email_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX idx_email_campaigns_sent_at ON email_campaigns(sent_at DESC);