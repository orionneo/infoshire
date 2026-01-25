-- Add provider field to email_config table
ALTER TABLE email_config 
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'smtp' CHECK (provider IN ('smtp', 'resend'));

-- Add resend_api_key field (will be stored in Supabase secrets, this is just for reference)
ALTER TABLE email_config 
ADD COLUMN IF NOT EXISTS resend_from_email TEXT;

-- Make SMTP fields nullable since they're not needed for Resend
ALTER TABLE email_config 
ALTER COLUMN smtp_host DROP NOT NULL,
ALTER COLUMN smtp_user DROP NOT NULL,
ALTER COLUMN from_email DROP NOT NULL;

-- Update default config to use Resend
UPDATE email_config 
SET provider = 'resend',
    resend_from_email = 'onboarding@resend.dev',
    from_name = 'InfoShire Assistência Técnica',
    is_active = false
WHERE smtp_user = 'seu-email@hotmail.com';

COMMENT ON COLUMN email_config.provider IS 'Email provider: smtp (custom SMTP) or resend (Resend API)';
COMMENT ON COLUMN email_config.resend_from_email IS 'From email for Resend (use onboarding@resend.dev for testing or verify your domain)';
COMMENT ON TABLE email_config IS 'Email configuration supporting both SMTP and Resend providers';