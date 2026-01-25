-- Allow admins to delete approval history entries
CREATE POLICY "Admins can delete approval history" ON approval_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );