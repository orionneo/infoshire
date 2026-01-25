-- Add password_changed field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false;

-- Update existing profiles created by admin (with default password) to require password change
UPDATE profiles
SET password_changed = false
WHERE role = 'client' AND password_changed IS NULL;