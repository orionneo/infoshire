-- Add definition_web_source column to ai_terms table
ALTER TABLE public.ai_terms 
ADD COLUMN IF NOT EXISTS definition_web_source TEXT;

-- Add comment
COMMENT ON COLUMN public.ai_terms.definition_web_source IS 'Source URL or reference for web-sourced definition';