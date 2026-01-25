-- Migration: 00035_fix_analytics_schema_and_rls.sql
-- Descrição: Corrigir schema de analytics e RLS para permitir tracking público

-- Adicionar colunas faltantes em analytics_sessions
ALTER TABLE public.analytics_sessions
ADD COLUMN IF NOT EXISTS visitor_id text,
ADD COLUMN IF NOT EXISTS referrer text,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS page_entry text;

-- Garantir que is_bot tem default false
ALTER TABLE public.analytics_sessions
ALTER COLUMN is_bot SET DEFAULT false,
ALTER COLUMN is_bot SET NOT NULL;

-- Adicionar visitor_id em analytics_pageviews
ALTER TABLE public.analytics_pageviews
ADD COLUMN IF NOT EXISTS visitor_id text;

-- Adicionar visitor_id em analytics_events
ALTER TABLE public.analytics_events
ADD COLUMN IF NOT EXISTS visitor_id text;

-- Criar índices para visitor_id
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_visitor_id ON public.analytics_pageviews(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON public.analytics_events(visitor_id);

-- Função RPC para incrementar page_count
CREATE OR REPLACE FUNCTION public.increment_page_count(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_sessions
  SET page_count = page_count + 1
  WHERE session_id = p_session_id;
END;
$$;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can insert analytics sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Anyone can insert analytics sources" ON public.analytics_sources;
DROP POLICY IF EXISTS "Anyone can insert analytics pageviews" ON public.analytics_pageviews;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can update analytics sessions" ON public.analytics_sessions;

-- Criar novas políticas mais permissivas para tracking público

-- analytics_sessions: permitir INSERT e UPDATE anônimo
CREATE POLICY "Public can insert analytics sessions"
  ON public.analytics_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL 
    AND session_id != ''
    AND visitor_id IS NOT NULL
    AND visitor_id != ''
  );

CREATE POLICY "Public can update own analytics sessions"
  ON public.analytics_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    session_id IS NOT NULL 
    AND session_id != ''
  );

-- analytics_sources: permitir INSERT anônimo
CREATE POLICY "Public can insert analytics sources"
  ON public.analytics_sources
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL 
    AND session_id != ''
    AND source_type IS NOT NULL
  );

-- analytics_pageviews: permitir INSERT anônimo
CREATE POLICY "Public can insert analytics pageviews"
  ON public.analytics_pageviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL 
    AND session_id != ''
    AND visitor_id IS NOT NULL
    AND page_path IS NOT NULL
  );

-- analytics_events: permitir INSERT anônimo com validação de event_type
CREATE POLICY "Public can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL 
    AND session_id != ''
    AND visitor_id IS NOT NULL
    AND event_type IN (
      'whatsapp_click',
      'phone_click',
      'email_click',
      'instagram_click',
      'budget_click',
      'form_submit',
      'download',
      'video_play'
    )
  );

-- Manter políticas de SELECT apenas para admins (já existentes)
-- Não precisamos recriar pois já existem

COMMENT ON FUNCTION public.increment_page_count(text) IS 'Incrementa contador de páginas visualizadas na sessão';