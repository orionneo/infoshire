-- Function to extract documented cases from completed service orders
CREATE OR REPLACE FUNCTION extract_cases_from_service_orders()
RETURNS INTEGER AS $$
DECLARE
  admin_user_id UUID;
  cases_created INTEGER := 0;
BEGIN
  -- Get first admin user to attribute cases
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  -- Extract cases from completed service orders with meaningful data
  WITH extracted_cases AS (
    INSERT INTO ai_documented_cases (
      created_by,
      title,
      equipment_type,
      brand,
      problem_description,
      solution_description,
      tags,
      difficulty_level,
      estimated_time_minutes,
      estimated_cost,
      notes,
      is_active,
      is_verified,
      verified_by,
      verified_at
    )
    SELECT DISTINCT ON (so.equipment, LEFT(so.problem_description, 100))
      admin_user_id,
      CASE 
        WHEN so.equipment ILIKE '%notebook%' THEN 'Reparo em ' || so.equipment
        WHEN so.equipment ILIKE '%celular%' OR so.equipment ILIKE '%smartphone%' THEN 'Conserto de ' || so.equipment
        WHEN so.equipment ILIKE '%desktop%' OR so.equipment ILIKE '%computador%' THEN 'Manutenção de ' || so.equipment
        ELSE 'Reparo de ' || so.equipment
      END as title,
      CASE 
        WHEN so.equipment ILIKE '%notebook%' THEN 'Notebook'
        WHEN so.equipment ILIKE '%celular%' OR so.equipment ILIKE '%smartphone%' OR so.equipment ILIKE '%iphone%' OR so.equipment ILIKE '%samsung%' THEN 'Smartphone'
        WHEN so.equipment ILIKE '%desktop%' OR so.equipment ILIKE '%computador%' OR so.equipment ILIKE '%pc%' THEN 'Desktop'
        WHEN so.equipment ILIKE '%tablet%' OR so.equipment ILIKE '%ipad%' THEN 'Tablet'
        WHEN so.equipment ILIKE '%impressora%' THEN 'Impressora'
        WHEN so.equipment ILIKE '%monitor%' THEN 'Monitor'
        ELSE so.equipment
      END as equipment_type,
      CASE 
        WHEN so.equipment ILIKE '%dell%' THEN 'Dell'
        WHEN so.equipment ILIKE '%hp%' THEN 'HP'
        WHEN so.equipment ILIKE '%lenovo%' THEN 'Lenovo'
        WHEN so.equipment ILIKE '%asus%' THEN 'Asus'
        WHEN so.equipment ILIKE '%acer%' THEN 'Acer'
        WHEN so.equipment ILIKE '%samsung%' THEN 'Samsung'
        WHEN so.equipment ILIKE '%iphone%' OR so.equipment ILIKE '%apple%' OR so.equipment ILIKE '%macbook%' THEN 'Apple'
        WHEN so.equipment ILIKE '%motorola%' THEN 'Motorola'
        WHEN so.equipment ILIKE '%xiaomi%' THEN 'Xiaomi'
        WHEN so.equipment ILIKE '%lg%' THEN 'LG'
        ELSE NULL
      END as brand,
      so.problem_description,
      'Equipamento reparado com sucesso. Problema identificado e solucionado conforme procedimentos técnicos padrão.' as solution_description,
      ARRAY[
        CASE 
          WHEN so.problem_description ILIKE '%não liga%' OR so.problem_description ILIKE '%nao liga%' THEN 'não liga'
          WHEN so.problem_description ILIKE '%tela%' THEN 'tela'
          WHEN so.problem_description ILIKE '%bateria%' THEN 'bateria'
          WHEN so.problem_description ILIKE '%carregador%' OR so.problem_description ILIKE '%carrega%' THEN 'carregamento'
          WHEN so.problem_description ILIKE '%lento%' OR so.problem_description ILIKE '%travando%' THEN 'lentidão'
          WHEN so.problem_description ILIKE '%vírus%' OR so.problem_description ILIKE '%virus%' THEN 'vírus'
          WHEN so.problem_description ILIKE '%água%' OR so.problem_description ILIKE '%molhou%' THEN 'dano líquido'
          WHEN so.problem_description ILIKE '%queda%' OR so.problem_description ILIKE '%quebr%' THEN 'dano físico'
          WHEN so.problem_description ILIKE '%som%' OR so.problem_description ILIKE '%áudio%' THEN 'áudio'
          WHEN so.problem_description ILIKE '%wifi%' OR so.problem_description ILIKE '%internet%' THEN 'conectividade'
          ELSE 'reparo geral'
        END
      ]::TEXT[] as tags,
      CASE 
        WHEN COALESCE(so.total_cost, 0) < 100 THEN 'easy'
        WHEN COALESCE(so.total_cost, 0) < 300 THEN 'medium'
        ELSE 'hard'
      END as difficulty_level,
      CASE 
        WHEN COALESCE(so.total_cost, 0) < 100 THEN 30
        WHEN COALESCE(so.total_cost, 0) < 300 THEN 90
        ELSE 180
      END as estimated_time_minutes,
      COALESCE(so.total_cost, 0) as estimated_cost,
      'Caso extraído automaticamente de ordem de serviço concluída (OS #' || so.order_number || ').' as notes,
      true as is_active,
      true as is_verified,
      admin_user_id as verified_by,
      now() as verified_at
    FROM service_orders so
    WHERE so.status IN ('completed', 'ready_for_pickup')
      AND so.problem_description IS NOT NULL
      AND LENGTH(so.problem_description) > 20
      AND so.equipment IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM ai_documented_cases adc
        WHERE adc.problem_description = so.problem_description
      )
    ORDER BY so.equipment, LEFT(so.problem_description, 100), so.created_at DESC
    LIMIT 30
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO cases_created FROM extracted_cases;

  RETURN cases_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION extract_cases_from_service_orders IS 'Extracts documented cases from completed service orders';

-- Execute the function to populate initial data from existing orders
SELECT extract_cases_from_service_orders() as cases_created_from_orders;