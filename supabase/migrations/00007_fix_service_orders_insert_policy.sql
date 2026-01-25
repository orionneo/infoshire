-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert service_orders" ON service_orders;

-- Recreate with explicit check
CREATE POLICY "Admins can insert service_orders"
  ON service_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );