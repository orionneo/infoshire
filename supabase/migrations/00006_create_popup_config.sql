-- Create popup_config table
CREATE TABLE IF NOT EXISTS popup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT false,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  button_text TEXT DEFAULT 'Fechar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default popup config
INSERT INTO popup_config (is_active, title, description, button_text)
VALUES (false, 'Promoção Especial!', 'Confira nossas ofertas exclusivas.', 'Fechar')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE popup_config ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read popup config
CREATE POLICY "Anyone can view popup config"
  ON popup_config
  FOR SELECT
  USING (true);

-- Policy: Only admins can update popup config
CREATE POLICY "Admins can update popup config"
  ON popup_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert popup config
CREATE POLICY "Admins can insert popup config"
  ON popup_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );