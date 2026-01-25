-- Adicionar suporte a múltiplos equipamentos por OS

-- 1. Adicionar campo has_multiple_items na tabela service_orders
ALTER TABLE service_orders
ADD COLUMN has_multiple_items BOOLEAN DEFAULT false;

-- 2. Criar tabela para itens adicionais da OS
CREATE TABLE service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  equipment TEXT NOT NULL,
  serial_number TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Criar índice para melhor performance
CREATE INDEX idx_service_order_items_order_id ON service_order_items(service_order_id);

-- 4. Habilitar RLS
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para service_order_items

-- Admins podem fazer tudo
CREATE POLICY "Admins podem gerenciar todos os itens"
  ON service_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Clientes podem ver apenas itens de suas próprias ordens
CREATE POLICY "Clientes podem ver itens de suas ordens"
  ON service_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = service_order_items.service_order_id
      AND service_orders.client_id = auth.uid()
    )
  );

-- 6. Comentários para documentação
COMMENT ON TABLE service_order_items IS 'Itens adicionais/equipamentos de uma ordem de serviço';
COMMENT ON COLUMN service_order_items.service_order_id IS 'Referência à ordem de serviço';
COMMENT ON COLUMN service_order_items.equipment IS 'Nome/tipo do equipamento adicional';
COMMENT ON COLUMN service_order_items.serial_number IS 'Número de série do equipamento';
COMMENT ON COLUMN service_order_items.description IS 'Descrição ou observações sobre o item';
