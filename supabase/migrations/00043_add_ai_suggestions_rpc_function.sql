-- Create RPC function for AI suggestions that works without authentication
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
  
  -- Extract keywords (simple split by space)
  v_keywords := string_to_array(v_normalized_text, ' ');
  
  -- Find matching terms in database
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'term', term,
    'definition', definition_internal,
    'category', term_category
  )), '[]'::JSONB)
  INTO v_terms
  FROM ai_terms
  WHERE v_normalized_text LIKE '%' || normalized_term || '%'
  LIMIT 10;
  
  -- Determine category based on found terms
  SELECT term_category INTO v_category
  FROM ai_terms
  WHERE v_normalized_text LIKE '%' || normalized_term || '%'
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
  
  -- Generate clarification questions
  v_questions := jsonb_build_array(
    'Qual é o problema específico do equipamento?',
    'O equipamento liga?',
    'Quando o problema começou?',
    'Há sinais de dano físico?',
    'O problema ocorre sempre ou apenas às vezes?',
    'O equipamento sofreu alguma queda ou contato com líquido?'
  );
  
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
      'terms_found', jsonb_array_length(v_terms)
    )
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_ai_suggestions(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_ai_suggestions IS 'Get AI suggestions for service order problem description. Works without authentication.';