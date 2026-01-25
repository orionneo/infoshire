-- =============================================
-- AI KNOWLEDGE ENGINE - BASE TABLES
-- =============================================

-- 1) AI Knowledge Events: Training signals from technicians
CREATE TABLE IF NOT EXISTS public.ai_knowledge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  
  -- Equipment context
  equipamento_tipo TEXT,
  marca TEXT,
  modelo TEXT,
  
  -- Raw data captured
  raw_text TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'OS_CREATE', 'OS_UPDATE', 'STATUS_CHANGE', 'SOLUTION_MARKED'
  
  -- Processed data
  normalized_terms TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  solution_tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  confidence NUMERIC(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  source TEXT DEFAULT 'TECH', -- 'TECH', 'CLIENT', 'SYSTEM'
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'INDEXED'
  
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_ai_events_os ON public.ai_knowledge_events(os_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_status ON public.ai_knowledge_events(status);
CREATE INDEX IF NOT EXISTS idx_ai_events_created ON public.ai_knowledge_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_equipment ON public.ai_knowledge_events(equipamento_tipo, marca, modelo);

-- 2) AI Terms: Living glossary
CREATE TABLE IF NOT EXISTS public.ai_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Term data
  term TEXT NOT NULL UNIQUE,
  normalized_term TEXT NOT NULL,
  synonyms TEXT[] DEFAULT '{}',
  
  -- Definitions
  definition_internal TEXT,
  definition_web TEXT,
  
  -- Usage stats
  frequency INTEGER DEFAULT 1,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relationships
  related_terms TEXT[] DEFAULT '{}',
  equipment_types TEXT[] DEFAULT '{}',
  examples TEXT[] DEFAULT '{}',
  
  -- Categories
  term_category TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_terms_term ON public.ai_terms(term);
CREATE INDEX IF NOT EXISTS idx_ai_terms_normalized ON public.ai_terms(normalized_term);
CREATE INDEX IF NOT EXISTS idx_ai_terms_frequency ON public.ai_terms(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_ai_terms_category ON public.ai_terms(term_category);

-- 3) AI Web Sources: Optional web-sourced knowledge
CREATE TABLE IF NOT EXISTS public.ai_web_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  term TEXT NOT NULL,
  term_id UUID REFERENCES public.ai_terms(id) ON DELETE CASCADE,
  
  -- Source info
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT,
  
  -- Extracted content
  extracted_summary TEXT,
  troubleshooting_steps TEXT[],
  
  -- Trust & validation
  trust_score NUMERIC(3,2) DEFAULT 0.5,
  is_whitelisted BOOLEAN DEFAULT false,
  
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_trust_score CHECK (trust_score >= 0 AND trust_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_ai_web_term ON public.ai_web_sources(term);
CREATE INDEX IF NOT EXISTS idx_ai_web_trust ON public.ai_web_sources(trust_score DESC);

-- 4) AI Errors: Anti-crash error logging
CREATE TABLE IF NOT EXISTS public.ai_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Input snapshot for debugging
  input_snapshot JSONB,
  
  -- Context
  user_id UUID,
  os_id UUID,
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_errors_function ON public.ai_errors(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_errors_created ON public.ai_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_errors_resolved ON public.ai_errors(resolved);

-- 5) AI Configuration: System settings for Knowledge Engine
CREATE TABLE IF NOT EXISTS public.ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'STRING',
  description TEXT,
  
  is_active BOOLEAN DEFAULT true
);

-- Insert default configuration
INSERT INTO public.ai_config (config_key, config_value, config_type, description) VALUES
  ('WEB_ENABLED', 'false', 'BOOLEAN', 'Habilitar busca web para enriquecer conhecimento'),
  ('RESTRICTED_WEB', 'true', 'BOOLEAN', 'Restringir busca web apenas a fontes confiáveis'),
  ('MIN_TERM_FREQUENCY', '2', 'NUMBER', 'Frequência mínima para considerar termo relevante'),
  ('SIMILARITY_THRESHOLD', '0.6', 'NUMBER', 'Threshold para casos similares (0.0 a 1.0)'),
  ('MAX_SIMILAR_CASES', '5', 'NUMBER', 'Número máximo de casos similares a retornar'),
  ('AUTO_LEARN_ENABLED', 'true', 'BOOLEAN', 'Aprendizado automático ao salvar OS')
ON CONFLICT (config_key) DO NOTHING;

-- 6) AI Similar Cases Cache
CREATE TABLE IF NOT EXISTS public.ai_similar_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  os_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  similar_os_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  
  similarity_score NUMERIC(3,2) NOT NULL,
  matching_terms TEXT[],
  
  -- Anonymized data for display
  anonymized_description TEXT,
  anonymized_solution TEXT,
  
  CONSTRAINT different_orders CHECK (os_id != similar_os_id),
  CONSTRAINT valid_similarity CHECK (similarity_score >= 0 AND similarity_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_ai_similar_os ON public.ai_similar_cases(os_id);
CREATE INDEX IF NOT EXISTS idx_ai_similar_score ON public.ai_similar_cases(similarity_score DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.ai_knowledge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_web_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_similar_cases ENABLE ROW LEVEL SECURITY;

-- Simple policies: authenticated users can read, service role can write
CREATE POLICY "Allow authenticated read ai_events" ON public.ai_knowledge_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read ai_terms" ON public.ai_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read ai_web" ON public.ai_web_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read ai_errors" ON public.ai_errors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read ai_config" ON public.ai_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read ai_similar" ON public.ai_similar_cases FOR SELECT TO authenticated USING (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to normalize Portuguese text
CREATE OR REPLACE FUNCTION public.normalize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(
    translate(
      input_text,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
    )
  );
END;
$$;

-- Function to extract keywords from text
CREATE OR REPLACE FUNCTION public.extract_keywords(input_text TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
  words TEXT[];
  stopwords TEXT[] := ARRAY['o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'na', 'no', 'os', 'as', 'dos', 'das', 'um', 'uma', 'e', 'ou', 'que', 'se', 'ao', 'aos'];
  result TEXT[] := '{}';
  word TEXT;
BEGIN
  normalized := public.normalize_text(input_text);
  words := regexp_split_to_array(normalized, '\s+');
  
  FOREACH word IN ARRAY words
  LOOP
    IF length(word) >= 3 AND NOT (word = ANY(stopwords)) THEN
      result := array_append(result, word);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

COMMENT ON TABLE public.ai_knowledge_events IS 'Eventos de aprendizado capturados de ações dos técnicos';
COMMENT ON TABLE public.ai_terms IS 'Glossário vivo de termos técnicos com sinônimos e definições';
COMMENT ON TABLE public.ai_web_sources IS 'Conhecimento opcional obtido de fontes web confiáveis';
COMMENT ON TABLE public.ai_errors IS 'Log de erros do motor de IA para debugging';
COMMENT ON TABLE public.ai_config IS 'Configurações do Knowledge Engine';
COMMENT ON TABLE public.ai_similar_cases IS 'Cache de casos similares pré-computados';