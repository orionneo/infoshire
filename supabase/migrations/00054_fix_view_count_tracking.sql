-- Function to increment view count for a documented case
CREATE OR REPLACE FUNCTION increment_case_view_count(case_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_documented_cases
  SET 
    view_count = COALESCE(view_count, 0) + 1,
    updated_at = now()
  WHERE id = case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_case_view_count IS 'Increments the view count for a documented case when it is viewed';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_case_view_count TO authenticated, anon;