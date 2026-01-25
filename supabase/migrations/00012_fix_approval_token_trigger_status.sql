-- Fix the auto_generate_approval_token function to use correct enum value
CREATE OR REPLACE FUNCTION auto_generate_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to awaiting_approval and no token exists, generate one
  IF NEW.status = 'awaiting_approval' AND (NEW.approval_token IS NULL OR NEW.approval_token = '') THEN
    NEW.approval_token = generate_approval_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;