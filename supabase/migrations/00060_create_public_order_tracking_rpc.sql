-- RPC Function: Buscar OS por número (público, sem autenticação)
-- Retorna dados sanitizados da OS para consulta pública
CREATE OR REPLACE FUNCTION public.track_order_by_number(p_order_number TEXT)
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
    p.full_name AS client_name,
    -- Mascara email: ex***@***.com
    CASE 
      WHEN p.email IS NOT NULL THEN 
        SUBSTRING(p.email FROM 1 FOR 2) || '***@' || 
        SUBSTRING(p.email FROM POSITION('@' IN p.email) + 1)
      ELSE NULL
    END AS client_email_masked,
    -- Mascara telefone: (11) 9****-1234
    CASE 
      WHEN p.phone IS NOT NULL THEN 
        SUBSTRING(p.phone FROM 1 FOR 6) || '****' || 
        SUBSTRING(p.phone FROM LENGTH(p.phone) - 3)
      ELSE NULL
    END AS client_phone_masked
  FROM service_orders so
  INNER JOIN profiles p ON so.client_id = p.id
  WHERE so.order_number = p_order_number
  LIMIT 1;
END;
$$;

-- RPC Function: Buscar OS por email (público, sem autenticação)
-- Retorna lista de OS do cliente
CREATE OR REPLACE FUNCTION public.track_orders_by_email(p_email TEXT)
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
  client_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validação básica de email
  IF p_email IS NULL OR p_email = '' OR p_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;

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
    p.full_name AS client_name
  FROM service_orders so
  INNER JOIN profiles p ON so.client_id = p.id
  WHERE LOWER(p.email) = LOWER(p_email)
  ORDER BY so.created_at DESC
  LIMIT 20; -- Limita a 20 OS por segurança
END;
$$;

-- Grant execute permissions to anon users (public access)
GRANT EXECUTE ON FUNCTION public.track_order_by_number(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.track_orders_by_email(TEXT) TO anon;

-- Create index for better performance on order_number lookups
CREATE INDEX IF NOT EXISTS idx_service_orders_order_number ON service_orders(order_number);

COMMENT ON FUNCTION public.track_order_by_number IS 'Permite consulta pública de OS por número, retornando dados sanitizados';
COMMENT ON FUNCTION public.track_orders_by_email IS 'Permite consulta pública de OS por email do cliente, retornando lista de ordens';