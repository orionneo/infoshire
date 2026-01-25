-- Add admin notification flag to approval_history
ALTER TABLE approval_history
ADD COLUMN admin_notified BOOLEAN DEFAULT FALSE,
ADD COLUMN admin_viewed BOOLEAN DEFAULT FALSE;