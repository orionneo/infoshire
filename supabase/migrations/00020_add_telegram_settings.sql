-- Add Telegram settings to site_settings
ALTER TABLE site_settings
ADD COLUMN telegram_chat_id TEXT,
ADD COLUMN telegram_notifications_enabled BOOLEAN DEFAULT FALSE;