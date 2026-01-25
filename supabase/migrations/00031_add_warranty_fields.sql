-- Adicionar campos de garantia à tabela service_orders
-- Migration: 00031_add_warranty_fields.sql
-- Descrição: Implementa sistema de garantia padrão de 90 dias para ordens de serviço

-- Adicionar novos campos à tabela service_orders
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz,
  ADD COLUMN IF NOT EXISTS data_retirada timestamptz,
  ADD COLUMN IF NOT EXISTS data_fim_garantia timestamptz,
  ADD COLUMN IF NOT EXISTS em_garantia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS retorno_garantia boolean DEFAULT false;

-- Adicionar comentários aos campos para documentação
COMMENT ON COLUMN public.service_orders.data_conclusao IS 'Data em que a OS foi marcada como finalizada/pronta para retirada';
COMMENT ON COLUMN public.service_orders.data_retirada IS 'Data em que o cliente retirou o equipamento';
COMMENT ON COLUMN public.service_orders.data_fim_garantia IS 'Data de término da garantia (data_conclusao + 90 dias)';
COMMENT ON COLUMN public.service_orders.em_garantia IS 'Indica se a OS ainda está dentro do período de garantia';
COMMENT ON COLUMN public.service_orders.retorno_garantia IS 'Indica se esta OS é um retorno de garantia de outra OS';

-- Criar função para calcular automaticamente a data de fim de garantia
-- Esta função é chamada quando data_conclusao é definida
CREATE OR REPLACE FUNCTION public.calculate_warranty_end_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se data_conclusao foi definida e data_fim_garantia ainda não existe
  IF NEW.data_conclusao IS NOT NULL AND (OLD.data_conclusao IS NULL OR OLD.data_conclusao IS DISTINCT FROM NEW.data_conclusao) THEN
    -- Calcular data_fim_garantia como data_conclusao + 90 dias
    NEW.data_fim_garantia := NEW.data_conclusao + INTERVAL '90 days';
    
    -- Definir em_garantia como true se a data atual está dentro do período
    NEW.em_garantia := (CURRENT_TIMESTAMP <= NEW.data_fim_garantia);
  END IF;
  
  -- Se data_fim_garantia existe, atualizar em_garantia baseado na data atual
  IF NEW.data_fim_garantia IS NOT NULL THEN
    NEW.em_garantia := (CURRENT_TIMESTAMP <= NEW.data_fim_garantia);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para calcular data de fim de garantia automaticamente
DROP TRIGGER IF EXISTS trigger_calculate_warranty_end_date ON public.service_orders;
CREATE TRIGGER trigger_calculate_warranty_end_date
  BEFORE INSERT OR UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_warranty_end_date();

-- Criar função para atualizar data_conclusao quando status muda para 'completed' ou 'ready_for_pickup'
CREATE OR REPLACE FUNCTION public.update_completion_date_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o status mudou para 'completed' ou 'ready_for_pickup' e data_conclusao ainda não foi definida
  IF (NEW.status IN ('completed', 'ready_for_pickup')) 
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.data_conclusao IS NULL THEN
    -- Definir data_conclusao como a data/hora atual
    NEW.data_conclusao := CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar data_conclusao automaticamente
DROP TRIGGER IF EXISTS trigger_update_completion_date ON public.service_orders;
CREATE TRIGGER trigger_update_completion_date
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_completion_date_on_status_change();

-- Criar índices para melhorar performance de consultas de garantia
CREATE INDEX IF NOT EXISTS idx_service_orders_em_garantia 
  ON public.service_orders(em_garantia) 
  WHERE em_garantia = true;

CREATE INDEX IF NOT EXISTS idx_service_orders_data_fim_garantia 
  ON public.service_orders(data_fim_garantia) 
  WHERE data_fim_garantia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_data_conclusao 
  ON public.service_orders(data_conclusao) 
  WHERE data_conclusao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_client_equipment 
  ON public.service_orders(client_id, equipment);

-- Criar view para facilitar consultas de garantias expirando em breve
CREATE OR REPLACE VIEW public.warranties_expiring_soon AS
SELECT 
  so.id,
  so.order_number,
  so.client_id,
  so.equipment,
  so.serial_number,
  so.data_conclusao,
  so.data_fim_garantia,
  so.em_garantia,
  p.name as client_name,
  p.email as client_email,
  p.phone as client_phone,
  -- Dias restantes de garantia
  EXTRACT(DAY FROM (so.data_fim_garantia - CURRENT_TIMESTAMP))::integer as dias_restantes
FROM public.service_orders so
INNER JOIN public.profiles p ON so.client_id = p.id
WHERE 
  so.em_garantia = true
  AND so.data_fim_garantia IS NOT NULL
  AND so.data_fim_garantia BETWEEN CURRENT_TIMESTAMP AND (CURRENT_TIMESTAMP + INTERVAL '7 days')
ORDER BY so.data_fim_garantia ASC;

-- Comentário na view
COMMENT ON VIEW public.warranties_expiring_soon IS 'View que lista todas as garantias que expirarão nos próximos 7 dias';

-- Atualizar garantias existentes (para OSs já finalizadas)
-- Apenas para OSs que já estão com status 'completed' ou 'ready_for_pickup'
UPDATE public.service_orders
SET 
  data_conclusao = COALESCE(completed_at, updated_at),
  data_fim_garantia = COALESCE(completed_at, updated_at) + INTERVAL '90 days',
  em_garantia = (CURRENT_TIMESTAMP <= (COALESCE(completed_at, updated_at) + INTERVAL '90 days'))
WHERE 
  status IN ('completed', 'ready_for_pickup')
  AND data_conclusao IS NULL;
