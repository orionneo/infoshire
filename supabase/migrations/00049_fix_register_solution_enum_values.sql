-- Fix register_solution function - use correct enum values
CREATE OR REPLACE FUNCTION register_solution(
  p_os_id UUID,
  p_equipamento_tipo TEXT,
  p_problema_descricao TEXT,
  p_solucao_aplicada TEXT,
  p_causa_raiz TEXT,
  p_tags_solucao TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
  v_keywords TEXT[];
  v_normalized_terms TEXT[];
  v_categories TEXT[];
  v_result JSONB;
  v_keyword TEXT;
BEGIN
  -- Get current user ID (if authenticated)
  v_user_id := auth.uid();
  
  -- Validate required fields
  IF p_solucao_aplicada IS NULL OR length(trim(p_solucao_aplicada)) < 10 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Descrição da solução muito curta. Digite pelo menos 10 caracteres.'
    );
  END IF;
  
  IF p_causa_raiz IS NULL OR length(trim(p_causa_raiz)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Causa raiz é obrigatória.'
    );
  END IF;
  
  IF p_tags_solucao IS NULL OR array_length(p_tags_solucao, 1) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Selecione pelo menos uma tag de solução.'
    );
  END IF;
  
  -- Extract keywords from problem and solution
  v_keywords := extract_keywords(p_problema_descricao || ' ' || p_solucao_aplicada);
  
  -- Detect technical terms (loop through keywords)
  v_normalized_terms := ARRAY[]::TEXT[];
  FOREACH v_keyword IN ARRAY v_keywords
  LOOP
    IF v_keyword ~ '(bateria|tela|display|placa|agua|molh|oxid|queima|curto|modchip|chip|ic|capacitor|resistor|soldagem|troca|reparo|limpeza)' THEN
      v_normalized_terms := array_append(v_normalized_terms, v_keyword);
    END IF;
  END LOOP;
  
  -- Determine categories based on tags and keywords
  v_categories := ARRAY[]::TEXT[];
  
  IF 'Troca de Peça' = ANY(p_tags_solucao) THEN
    v_categories := array_append(v_categories, 'Substituição de Componente');
  END IF;
  
  IF 'Reparo de Placa' = ANY(p_tags_solucao) OR 'Micro-soldagem' = ANY(p_tags_solucao) THEN
    v_categories := array_append(v_categories, 'Reparo de Placa');
  END IF;
  
  IF 'Limpeza' = ANY(p_tags_solucao) THEN
    v_categories := array_append(v_categories, 'Limpeza e Manutenção');
  END IF;
  
  IF 'Atualização de Software' = ANY(p_tags_solucao) THEN
    v_categories := array_append(v_categories, 'Software');
  END IF;
  
  IF 'Substituição de Bateria' = ANY(p_tags_solucao) THEN
    v_categories := array_append(v_categories, 'Bateria');
  END IF;
  
  IF 'Troca de Display' = ANY(p_tags_solucao) THEN
    v_categories := array_append(v_categories, 'Tela/Display');
  END IF;
  
  -- If no categories detected, add generic one
  IF array_length(v_categories, 1) IS NULL THEN
    v_categories := ARRAY['Reparo Geral'];
  END IF;
  
  -- Insert into ai_knowledge_events
  INSERT INTO ai_knowledge_events (
    user_id,
    os_id,
    equipamento_tipo,
    raw_text,
    event_type,
    problema_descricao,
    solucao_aplicada,
    causa_raiz,
    tags_solucao,
    solution_tags,
    normalized_terms,
    categories,
    confidence,
    source,
    status,
    metadata
  ) VALUES (
    v_user_id,
    p_os_id,
    p_equipamento_tipo,
    p_problema_descricao || ' | SOLUÇÃO: ' || p_solucao_aplicada,
    'SOLUTION_APPLIED',
    p_problema_descricao,
    p_solucao_aplicada,
    p_causa_raiz,
    p_tags_solucao,
    p_tags_solucao, -- Also store in solution_tags for compatibility
    v_normalized_terms,
    v_categories,
    0.9, -- High confidence for manually registered solutions
    'TECH',
    'PROCESSED', -- Mark as processed immediately
    jsonb_build_object(
      'registered_at', now(),
      'registered_by', COALESCE(v_user_id::text, 'anonymous'),
      'keywords_extracted', array_length(v_keywords, 1),
      'terms_detected', array_length(v_normalized_terms, 1),
      'categories_assigned', array_length(v_categories, 1)
    )
  )
  RETURNING id INTO v_event_id;
  
  -- Update OS status if needed (mark as completed if not already)
  -- Only update if OS exists and is not already completed or ready for pickup
  UPDATE service_orders
  SET 
    status = CASE 
      WHEN status NOT IN ('completed'::order_status, 'ready_for_pickup'::order_status) 
      THEN 'completed'::order_status
      ELSE status
    END,
    completed_at = CASE
      WHEN completed_at IS NULL THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = p_os_id;
  
  -- Build success response
  v_result := jsonb_build_object(
    'ok', true,
    'event_id', v_event_id,
    'message', 'Solução registrada com sucesso!',
    'stats', jsonb_build_object(
      'keywords_extracted', array_length(v_keywords, 1),
      'terms_detected', array_length(v_normalized_terms, 1),
      'categories_assigned', array_length(v_categories, 1),
      'tags_applied', array_length(p_tags_solucao, 1)
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error in standard format
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'detail', 'Erro ao registrar solução. Por favor, tente novamente.'
  );
END;
$$;

COMMENT ON FUNCTION register_solution IS 'Register a solution for a service order and feed the AI learning system. Validates input, extracts keywords, assigns categories, and updates OS status.';