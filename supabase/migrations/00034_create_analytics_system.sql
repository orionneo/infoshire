-- Migration: 00034_create_analytics_system.sql
-- Descrição: Sistema completo de analytics para rastreamento de visitantes, páginas e eventos

-- Tabela de sessões de visitantes
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  first_visit timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  page_count integer DEFAULT 1,
  duration_seconds integer DEFAULT 0,
  is_bot boolean DEFAULT false,
  device_type text, -- mobile, desktop, tablet
  browser text,
  country text,
  city text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de origens de tráfego (UTM e referrer)
CREATE TABLE IF NOT EXISTS public.analytics_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  source_type text NOT NULL, -- google, instagram, facebook, whatsapp, direct, other
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de visualizações de página
CREATE TABLE IF NOT EXISTS public.analytics_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_title text,
  time_on_page integer DEFAULT 0, -- segundos
  created_at timestamptz DEFAULT now()
);

-- Tabela de eventos (cliques importantes)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  event_type text NOT NULL, -- whatsapp_click, phone_click, email_click, instagram_click, budget_click
  event_label text,
  page_path text,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created_at ON public.analytics_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_is_bot ON public.analytics_sessions(is_bot);
CREATE INDEX IF NOT EXISTS idx_analytics_sources_session_id ON public.analytics_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sources_source_type ON public.analytics_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_session_id ON public.analytics_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_page_path ON public.analytics_pageviews(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_created_at ON public.analytics_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Comentários
COMMENT ON TABLE public.analytics_sessions IS 'Sessões de visitantes do site';
COMMENT ON TABLE public.analytics_sources IS 'Origens de tráfego (UTM e referrer)';
COMMENT ON TABLE public.analytics_pageviews IS 'Visualizações de páginas';
COMMENT ON TABLE public.analytics_events IS 'Eventos de cliques importantes';

-- Habilitar RLS
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas admins podem ler analytics
CREATE POLICY "Admins can read analytics sessions"
  ON public.analytics_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read analytics sources"
  ON public.analytics_sources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read analytics pageviews"
  ON public.analytics_pageviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Políticas: Permitir inserção anônima (para tracking público)
CREATE POLICY "Anyone can insert analytics sessions"
  ON public.analytics_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert analytics sources"
  ON public.analytics_sources
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert analytics pageviews"
  ON public.analytics_pageviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Políticas: Permitir atualização de sessões (para duration)
CREATE POLICY "Anyone can update analytics sessions"
  ON public.analytics_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Função para limpar dados antigos (manter apenas 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.analytics_sessions
  WHERE created_at < now() - interval '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_analytics() IS 'Remove dados de analytics com mais de 90 dias';