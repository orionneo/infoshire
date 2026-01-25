-- RPC Function: Buscar OS por telefone (público, sem autenticação)
-- Retorna lista de OS do cliente baseado no telefone
CREATE OR REPLACE FUNCTION public.track_orders_by_phone(p_phone TEXT)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  equipment TEXT,
  problem_description TEXT,
  status order_status,
  entry_date TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  em_garantia BOOLEAN,
  data_fim_garantia TIMESTAMPTZ,
  -- Dados do cliente (parcialmente ocultos)
  client_name TEXT,
  client_email_masked TEXT,
  client_phone_masked TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validação básica
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RAISE EXCEPTION 'Telefone é obrigatório';
  END IF;

  -- Remove caracteres não numéricos do telefone para comparação
  RETURN QUERY
  SELECT 
    so.id,
    so.order_number,
    so.equipment,
    so.problem_description,
    so.status,
    so.entry_date,
    so.estimated_completion,
    so.completed_at,
    so.created_at,
    so.em_garantia,
    so.data_fim_garantia,
    -- Dados do cliente
    p.name AS client_name,
    -- Mascara email: ex***@***.com
    CASE 
      WHEN p.email IS NOT NULL THEN 
        SUBSTRING(p.email FROM 1 FOR 2) || '***@' || 
        SUBSTRING(p.email FROM POSITION('@' IN p.email) + 1)
      ELSE NULL
    END AS client_email_masked,
    -- Mascara telefone: (19) 9****-2727
    CASE 
      WHEN p.phone IS NOT NULL THEN 
        SUBSTRING(p.phone FROM 1 FOR 6) || '****' || 
        SUBSTRING(p.phone FROM LENGTH(p.phone) - 3)
      ELSE NULL
    END AS client_phone_masked
  FROM service_orders so
  INNER JOIN profiles p ON so.client_id = p.id
  WHERE 
    -- Remove caracteres especiais e compara apenas números
    REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g')
  ORDER BY so.created_at DESC;
END;
$$;

-- Permitir acesso público (anon)
GRANT EXECUTE ON FUNCTION public.track_orders_by_phone(TEXT) TO anon;

-- Comentário
COMMENT ON FUNCTION public.track_orders_by_phone IS 'Permite consulta pública de OS por telefone do cliente, retornando lista de ordens';