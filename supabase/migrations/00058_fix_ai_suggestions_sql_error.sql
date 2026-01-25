-- Fix SQL error in get_ai_suggestions RPC function
CREATE OR REPLACE FUNCTION get_ai_suggestions(
  p_text TEXT,
  p_equipamento_tipo TEXT DEFAULT NULL,
  p_marca TEXT DEFAULT NULL,
  p_modelo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_text TEXT;
  v_keywords TEXT[];
  v_terms JSONB := '[]'::JSONB;
  v_category TEXT := 'Hardware';
  v_checklist JSONB := '[]'::JSONB;
  v_questions JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  -- Normalize text
  v_normalized_text := LOWER(TRIM(p_text));
  
  -- Extract keywords (remove punctuation and split)
  v_keywords := string_to_array(regexp_replace(v_normalized_text, '[^\w\s]', '', 'g'), ' ');
  
  -- Remove empty strings and very short words
  v_keywords := ARRAY(SELECT unnest(v_keywords) WHERE length(unnest) >= 2);
  
  -- Find matching terms in database - FIXED SQL
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'term', term,
    'definition', definition_internal,
    'category', term_category
  )), '[]'::JSONB)
  INTO v_terms
  FROM ai_terms
  WHERE 
    -- Strategy 1: Exact match on any keyword
    normalized_term = ANY(v_keywords)
    -- Strategy 2: Partial match in full text
    OR v_normalized_text LIKE '%' || normalized_term || '%'
    -- Strategy 3: Term matches any keyword (FIXED)
    OR EXISTS (
      SELECT 1 FROM unnest(v_keywords) AS kw
      WHERE term ILIKE '%' || kw || '%' AND length(kw) >= 2
    )
    -- Strategy 4: Normalized term matches any keyword (FIXED)
    OR EXISTS (
      SELECT 1 FROM unnest(v_keywords) AS kw
      WHERE normalized_term LIKE '%' || kw || '%' AND length(kw) >= 2
    )
  LIMIT 10;
  
  -- Determine category based on found terms
  SELECT term_category INTO v_category
  FROM ai_terms
  WHERE 
    normalized_term = ANY(v_keywords)
    OR v_normalized_text LIKE '%' || normalized_term || '%'
  ORDER BY frequency DESC
  LIMIT 1;
  
  -- If no category found, use default
  v_category := COALESCE(v_category, 'Hardware');
  
  -- Generate checklist based on problem description
  v_checklist := jsonb_build_array(
    'Verificar se equipamento liga',
    'Testar botão de power',
    'Verificar sinais de curto-circuito',
    'Inspecionar placa-mãe'
  );
  
  -- Add specific checks based on keywords
  IF v_normalized_text LIKE '%bateria%' OR v_normalized_text LIKE '%carrega%' THEN
    v_checklist := v_checklist || jsonb_build_array(
      'Testar carregador',
      'Verificar porta de carga',
      'Medir tensão da bateria'
    );
  END IF;
  
  IF v_normalized_text LIKE '%tela%' OR v_normalized_text LIKE '%display%' THEN
    v_checklist := v_checklist || jsonb_build_array(
      'Verificar conexão do display',
      'Testar backlight',
      'Verificar cabo flat'
    );
  END IF;
  
  IF v_normalized_text LIKE '%agua%' OR v_normalized_text LIKE '%molhou%' OR v_normalized_text LIKE '%liquido%' OR v_normalized_text LIKE '%derramamento%' THEN
    v_checklist := jsonb_build_array(
      'Verificar sinais de oxidação',
      'Limpar contatos com álcool isopropílico',
      'Verificar curto-circuito',
      'Secar componentes completamente'
    );
    v_category := 'Dano por Líquido';
  END IF;
  
  IF v_normalized_text LIKE '%queimado%' OR v_normalized_text LIKE '%cheira%' OR v_normalized_text LIKE '%curto%' THEN
    v_checklist := jsonb_build_array(
      'Identificar componente queimado',
      'Verificar fusíveis',
      'Inspecionar trilhas da placa',
      'Verificar fonte de alimentação'
    );
    v_category := 'Dano Físico';
  END IF;
  
  -- PCB specific checks
  IF v_normalized_text LIKE '%pcb%' OR v_normalized_text LIKE '%placa%' OR v_normalized_text LIKE '%circuito%' THEN
    v_checklist := v_checklist || jsonb_build_array(
      'Inspecionar trilhas da PCB',
      'Verificar componentes soldados',
      'Testar continuidade das trilhas',
      'Verificar sinais de queima ou oxidação'
    );
  END IF;
  
  -- Generate clarification questions based on what's missing
  v_questions := jsonb_build_array();
  
  IF v_normalized_text NOT LIKE '%liga%' AND v_normalized_text NOT LIKE '%funciona%' THEN
    v_questions := v_questions || jsonb_build_array('O equipamento liga?');
  END IF;
  
  IF v_normalized_text NOT LIKE '%quando%' AND v_normalized_text NOT LIKE '%começou%' THEN
    v_questions := v_questions || jsonb_build_array('Quando o problema começou?');
  END IF;
  
  IF v_normalized_text NOT LIKE '%queda%' AND v_normalized_text NOT LIKE '%dano%' THEN
    v_questions := v_questions || jsonb_build_array('Há sinais de dano físico visível?');
  END IF;
  
  IF v_normalized_text NOT LIKE '%sempre%' AND v_normalized_text NOT LIKE '%vezes%' THEN
    v_questions := v_questions || jsonb_build_array('O problema ocorre sempre ou apenas às vezes?');
  END IF;
  
  IF v_normalized_text NOT LIKE '%liquido%' AND v_normalized_text NOT LIKE '%agua%' AND v_normalized_text NOT LIKE '%molhou%' THEN
    v_questions := v_questions || jsonb_build_array('O equipamento teve contato com líquido?');
  END IF;
  
  -- Always add at least one question
  IF jsonb_array_length(v_questions) = 0 THEN
    v_questions := jsonb_build_array(
      'Qual é o comportamento específico do problema?',
      'Já foi feita alguma tentativa de reparo?'
    );
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'ok', true,
    'mode', 'OPEN_OS',
    'suggestions', jsonb_build_object(
      'organized_description', p_text,
      'suggested_category', v_category,
      'initial_checklist', v_checklist,
      'clarification_questions', v_questions
    ),
    'knowledge', jsonb_build_object(
      'term_definitions', v_terms
    ),
    'meta', jsonb_build_object(
      'source', 'database_rpc',
      'terms_found', jsonb_array_length(v_terms),
      'keywords_extracted', array_to_json(v_keywords)
    )
  );
  
  RETURN v_result;
END;
$$;