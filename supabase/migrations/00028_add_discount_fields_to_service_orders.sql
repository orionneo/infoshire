-- Adicionar campos de desconto à tabela service_orders
ALTER TABLE service_orders
ADD COLUMN discount_amount NUMERIC DEFAULT 0,
ADD COLUMN discount_reason TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN service_orders.discount_amount IS 'Valor do desconto aplicado à ordem de serviço';
COMMENT ON COLUMN service_orders.discount_reason IS 'Motivo/justificativa do desconto aplicado';