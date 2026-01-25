-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public to insert approval history" ON approval_history;
DROP POLICY IF EXISTS "Admins can view approval history" ON approval_history;

-- Allow anonymous users to insert approval history records
CREATE POLICY "Allow public to insert approval history"
ON approval_history FOR INSERT
TO anon
WITH CHECK (true);

-- Allow admins to view approval history
CREATE POLICY "Admins can view approval history"
ON approval_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);