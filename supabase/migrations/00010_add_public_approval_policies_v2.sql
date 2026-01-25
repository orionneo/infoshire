-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public to view orders by approval token" ON service_orders;
DROP POLICY IF EXISTS "Allow public to approve orders by token" ON service_orders;

-- Allow anonymous users to view service_orders by approval_token (for approval page)
CREATE POLICY "Allow public to view orders by approval token"
ON service_orders FOR SELECT
TO anon
USING (approval_token IS NOT NULL);

-- Allow anonymous users to update service_orders via approval_token (for approval)
CREATE POLICY "Allow public to approve orders by token"
ON service_orders FOR UPDATE
TO anon
USING (approval_token IS NOT NULL)
WITH CHECK (approval_token IS NOT NULL);