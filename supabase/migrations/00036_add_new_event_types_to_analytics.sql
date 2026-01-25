-- Migration: 00036_add_new_event_types_to_analytics.sql
-- Descrição: Adicionar novos tipos de eventos ao allowlist do RLS

-- Atualizar política de INSERT em analytics_events para incluir novos tipos
DROP POLICY IF EXISTS "Public can insert analytics events" ON public.analytics_events;

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
      'facebook_click',
      'budget_click',
      'login_click',
      'form_submit',
      'download',
      'video_play'
    )
  );

COMMENT ON POLICY "Public can insert analytics events" ON public.analytics_events IS 
'Permite inserção anônima de eventos com allowlist de tipos válidos incluindo redes sociais e ações de conversão';