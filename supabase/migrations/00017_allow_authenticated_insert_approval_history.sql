-- Allow authenticated users to insert approval history
CREATE POLICY "Authenticated users can insert approval history" ON approval_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);