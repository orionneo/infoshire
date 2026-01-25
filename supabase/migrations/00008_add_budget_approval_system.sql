-- Add budget and approval fields to service_orders table
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS parts_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS budget_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS budget_notes TEXT;

-- Create index on approval_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_service_orders_approval_token ON service_orders(approval_token);

-- Create approval_history table to track all approvals
CREATE TABLE IF NOT EXISTS approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  labor_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on order_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_approval_history_order_id ON approval_history(order_id);

-- Enable RLS on approval_history
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view approval history
CREATE POLICY "Allow authenticated users to view approval history"
ON approval_history FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow public insert for approvals (via approval token)
CREATE POLICY "Allow public insert for approvals"
ON approval_history FOR INSERT
TO anon
WITH CHECK (true);

-- Function to generate approval token
CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate approval token when status changes to aguardando_aprovacao
CREATE OR REPLACE FUNCTION auto_generate_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to aguardando_aprovacao and no token exists, generate one
  IF NEW.status = 'aguardando_aprovacao' AND (NEW.approval_token IS NULL OR NEW.approval_token = '') THEN
    NEW.approval_token = generate_approval_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating approval token
DROP TRIGGER IF EXISTS trigger_auto_generate_approval_token ON service_orders;
CREATE TRIGGER trigger_auto_generate_approval_token
BEFORE INSERT OR UPDATE ON service_orders
FOR EACH ROW
EXECUTE FUNCTION auto_generate_approval_token();