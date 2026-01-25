
-- Create table for manually documented cases by technicians
CREATE TABLE IF NOT EXISTS ai_documented_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Attribution
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Case details
  title TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  
  -- Problem and solution
  problem_description TEXT NOT NULL,
  solution_description TEXT NOT NULL,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  estimated_time_minutes INTEGER,
  
  -- Parts and costs (optional)
  parts_used TEXT[],
  estimated_cost DECIMAL(10,2),
  
  -- Additional info
  notes TEXT,
  
  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  used_in_diagnosis_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_documented_cases_equipment ON ai_documented_cases(equipment_type);
CREATE INDEX IF NOT EXISTS idx_ai_documented_cases_brand ON ai_documented_cases(brand);
CREATE INDEX IF NOT EXISTS idx_ai_documented_cases_created_by ON ai_documented_cases(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_documented_cases_tags ON ai_documented_cases USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_documented_cases_active ON ai_documented_cases(is_active) WHERE is_active = true;

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_ai_documented_cases_search ON ai_documented_cases 
USING GIN(to_tsvector('portuguese', 
  coalesce(title, '') || ' ' || 
  coalesce(problem_description, '') || ' ' || 
  coalesce(solution_description, '') || ' ' ||
  coalesce(equipment_type, '') || ' ' ||
  coalesce(brand, '') || ' ' ||
  coalesce(model, '')
));

-- Enable RLS
ALTER TABLE ai_documented_cases ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can do everything
CREATE POLICY "Admins can manage documented cases"
  ON ai_documented_cases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_documented_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_ai_documented_cases_updated_at
  BEFORE UPDATE ON ai_documented_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_documented_cases_updated_at();

-- Function to get autocomplete suggestions for equipment types
CREATE OR REPLACE FUNCTION get_equipment_suggestions(search_term TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(equipment_type TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT so.equipment, COUNT(*) as count
  FROM service_orders so
  WHERE so.equipment ILIKE '%' || search_term || '%'
  GROUP BY so.equipment
  ORDER BY count DESC, so.equipment
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get brand suggestions
CREATE OR REPLACE FUNCTION get_brand_suggestions(search_term TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(brand TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT adc.brand, COUNT(*) as count
  FROM ai_documented_cases adc
  WHERE adc.brand IS NOT NULL 
  AND adc.brand ILIKE '%' || search_term || '%'
  AND adc.is_active = true
  GROUP BY adc.brand
  ORDER BY count DESC, adc.brand
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tag suggestions
CREATE OR REPLACE FUNCTION get_tag_suggestions(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
  FROM ai_documented_cases
  WHERE unnest(tags) ILIKE '%' || search_term || '%'
  AND is_active = true
  GROUP BY tag
  ORDER BY count DESC, tag
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search documented cases
CREATE OR REPLACE FUNCTION search_documented_cases(
  search_query TEXT DEFAULT NULL,
  equipment_filter TEXT DEFAULT NULL,
  brand_filter TEXT DEFAULT NULL,
  difficulty_filter TEXT DEFAULT NULL,
  tag_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  creator_name TEXT,
  title TEXT,
  equipment_type TEXT,
  brand TEXT,
  model TEXT,
  problem_description TEXT,
  solution_description TEXT,
  tags TEXT[],
  difficulty_level TEXT,
  estimated_time_minutes INTEGER,
  parts_used TEXT[],
  estimated_cost DECIMAL,
  notes TEXT,
  view_count INTEGER,
  helpful_count INTEGER,
  used_in_diagnosis_count INTEGER,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    adc.id,
    adc.created_at,
    adc.updated_at,
    adc.created_by,
    p.name as creator_name,
    adc.title,
    adc.equipment_type,
    adc.brand,
    adc.model,
    adc.problem_description,
    adc.solution_description,
    adc.tags,
    adc.difficulty_level,
    adc.estimated_time_minutes,
    adc.parts_used,
    adc.estimated_cost,
    adc.notes,
    adc.view_count,
    adc.helpful_count,
    adc.used_in_diagnosis_count,
    adc.is_verified
  FROM ai_documented_cases adc
  LEFT JOIN profiles p ON p.id = adc.created_by
  WHERE adc.is_active = true
    AND (search_query IS NULL OR 
         to_tsvector('portuguese', 
           coalesce(adc.title, '') || ' ' || 
           coalesce(adc.problem_description, '') || ' ' || 
           coalesce(adc.solution_description, '') || ' ' ||
           coalesce(adc.equipment_type, '') || ' ' ||
           coalesce(adc.brand, '') || ' ' ||
           coalesce(adc.model, '')
         ) @@ plainto_tsquery('portuguese', search_query))
    AND (equipment_filter IS NULL OR adc.equipment_type ILIKE '%' || equipment_filter || '%')
    AND (brand_filter IS NULL OR adc.brand ILIKE '%' || brand_filter || '%')
    AND (difficulty_filter IS NULL OR adc.difficulty_level = difficulty_filter)
    AND (tag_filter IS NULL OR tag_filter = ANY(adc.tags))
  ORDER BY adc.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_case_view(case_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_documented_cases
  SET view_count = view_count + 1
  WHERE id = case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark case as helpful
CREATE OR REPLACE FUNCTION mark_case_helpful(case_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_documented_cases
  SET helpful_count = helpful_count + 1
  WHERE id = case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get knowledge contribution stats
CREATE OR REPLACE FUNCTION get_knowledge_contribution_stats()
RETURNS TABLE(
  total_cases INTEGER,
  total_contributors INTEGER,
  total_views INTEGER,
  total_helpful INTEGER,
  avg_time_minutes NUMERIC,
  top_contributors JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_cases,
    COUNT(DISTINCT created_by)::INTEGER as total_contributors,
    SUM(view_count)::INTEGER as total_views,
    SUM(helpful_count)::INTEGER as total_helpful,
    ROUND(AVG(estimated_time_minutes), 0) as avg_time_minutes,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', p.name,
          'count', contributor_stats.case_count,
          'helpful_total', contributor_stats.helpful_total
        )
      )
      FROM (
        SELECT 
          created_by,
          COUNT(*) as case_count,
          SUM(helpful_count) as helpful_total
        FROM ai_documented_cases
        WHERE is_active = true AND created_by IS NOT NULL
        GROUP BY created_by
        ORDER BY case_count DESC
        LIMIT 5
      ) contributor_stats
      LEFT JOIN profiles p ON p.id = contributor_stats.created_by
    ) as top_contributors
  FROM ai_documented_cases
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE ai_documented_cases IS 'Manually documented repair cases by technicians for AI knowledge base';
COMMENT ON FUNCTION search_documented_cases IS 'Full-text search for documented cases with filters';
COMMENT ON FUNCTION get_knowledge_contribution_stats IS 'Statistics about knowledge base contributions';
