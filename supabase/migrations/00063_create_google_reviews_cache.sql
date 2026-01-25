-- Tabela para cache de reviews do Google
CREATE TABLE IF NOT EXISTS google_reviews_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL,
  rating numeric,
  user_ratings_total integer,
  reviews jsonb,
  cached_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Índice para busca rápida por place_id
CREATE INDEX IF NOT EXISTS idx_google_reviews_place_id ON google_reviews_cache(place_id);

-- RLS: Permitir leitura pública (reviews são públicos)
ALTER TABLE google_reviews_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de reviews"
  ON google_reviews_cache
  FOR SELECT
  TO public
  USING (true);

-- Apenas service_role pode inserir/atualizar (via Edge Function)
CREATE POLICY "Service role pode gerenciar reviews"
  ON google_reviews_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);