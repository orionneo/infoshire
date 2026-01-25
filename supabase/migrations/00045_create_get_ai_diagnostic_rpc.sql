-- Create RPC function for AI diagnostic (IN_OS mode)
-- This function provides diagnostic suggestions without requiring JWT/Edge Function
CREATE OR REPLACE FUNCTION get_ai_diagnostic(
  p_text TEXT,
  p_equipamento_tipo TEXT DEFAULT NULL,
  p_marca TEXT DEFAULT NULL,
  p_modelo TEXT DEFAULT NULL,
  p_os_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_keywords TEXT[];
  v_technical_terms TEXT[];
  v_category TEXT;
  v_complexity TEXT;
  v_probable_causes JSONB;
  v_suggested_tests JSONB;
  v_technical_observations JSONB;
  v_common_parts JSONB;
  v_estimated_time TEXT;
  v_result JSONB;
  v_lower_text TEXT;
BEGIN
  -- Validate input
  IF p_text IS NULL OR length(trim(p_text)) < 10 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Texto muito curto. Digite pelo menos 10 caracteres.'
    );
  END IF;
  
  -- Extract keywords using existing function
  v_keywords := extract_keywords(p_text);
  v_lower_text := lower(p_text);
  
  -- Detect technical terms (simple pattern matching)
  v_technical_terms := ARRAY(
    SELECT unnest(v_keywords)
    WHERE unnest ~ '(bateria|tela|display|placa|agua|molh|oxid|queima|curto|nao|liga|carrega|touch|lcd|led)'
  );
  
  -- Determine category based on keywords
  v_category := 'Diagnóstico Geral';
  IF v_lower_text ~ '(bateria|carrega|descarrega)' THEN
    v_category := 'Bateria';
  ELSIF v_lower_text ~ '(tela|display|touch|lcd)' THEN
    v_category := 'Tela/Display';
  ELSIF v_lower_text ~ '(nao liga|não liga|morto|dead)' THEN
    v_category := 'Hardware';
  ELSIF v_lower_text ~ '(lento|trava|congela|travando)' THEN
    v_category := 'Software';
  ELSIF v_lower_text ~ '(agua|água|molhou|oxidação|oxidacao)' THEN
    v_category := 'Dano por Líquido';
  END IF;
  
  -- Determine complexity
  v_complexity := 'medium';
  IF v_lower_text ~ '(agua|água|molhou|oxidação|placa|motherboard|reballing)' THEN
    v_complexity := 'high';
  ELSIF v_lower_text ~ '(bateria|carregador|cabo|tela quebrada)' THEN
    v_complexity := 'low';
  END IF;
  
  -- Generate probable causes based on category
  v_probable_causes := '[]'::jsonb;
  
  IF v_category = 'Bateria' THEN
    v_probable_causes := jsonb_build_array(
      jsonb_build_object(
        'description', 'Bateria danificada ou fim de vida útil',
        'probability', 75,
        'reasoning', 'Baterias degradam com o tempo e uso. Sintomas incluem não carregar, descarregar rápido ou não ligar.'
      ),
      jsonb_build_object(
        'description', 'Problema no circuito de carga',
        'probability', 60,
        'reasoning', 'Conector de carga danificado, IC de carga com defeito ou trilha rompida na placa.'
      ),
      jsonb_build_object(
        'description', 'Carregador ou cabo defeituoso',
        'probability', 40,
        'reasoning', 'Carregador não fornece tensão adequada ou cabo com fio rompido.'
      )
    );
    v_estimated_time := '30-60 minutos';
    v_common_parts := jsonb_build_array(
      jsonb_build_object('part_name', 'Bateria', 'replacement_frequency', 'Alta'),
      jsonb_build_object('part_name', 'Conector de carga', 'replacement_frequency', 'Média'),
      jsonb_build_object('part_name', 'IC de carga', 'replacement_frequency', 'Baixa')
    );
    
  ELSIF v_category = 'Tela/Display' THEN
    v_probable_causes := jsonb_build_array(
      jsonb_build_object(
        'description', 'Tela fisicamente danificada (quebrada/trincada)',
        'probability', 80,
        'reasoning', 'Dano físico visível é a causa mais comum de problemas de tela.'
      ),
      jsonb_build_object(
        'description', 'Cabo flat da tela solto ou danificado',
        'probability', 50,
        'reasoning', 'Conexão entre placa e tela pode se soltar com quedas ou uso.'
      ),
      jsonb_build_object(
        'description', 'Backlight queimado (tela escura mas liga)',
        'probability', 35,
        'reasoning', 'LED de backlight pode queimar, deixando tela escura mas equipamento funcional.'
      )
    );
    v_estimated_time := '45-90 minutos';
    v_common_parts := jsonb_build_array(
      jsonb_build_object('part_name', 'Display completo', 'replacement_frequency', 'Alta'),
      jsonb_build_object('part_name', 'Cabo flat', 'replacement_frequency', 'Média'),
      jsonb_build_object('part_name', 'Backlight', 'replacement_frequency', 'Baixa')
    );
    
  ELSIF v_category = 'Hardware' THEN
    v_probable_causes := jsonb_build_array(
      jsonb_build_object(
        'description', 'Problema na placa-mãe (curto-circuito)',
        'probability', 65,
        'reasoning', 'Curto na placa impede ligação. Comum após dano por líquido ou componente queimado.'
      ),
      jsonb_build_object(
        'description', 'Bateria completamente descarregada ou morta',
        'probability', 55,
        'reasoning', 'Bateria sem carga ou danificada impede ligação do equipamento.'
      ),
      jsonb_build_object(
        'description', 'IC de power (gerenciamento de energia) defeituoso',
        'probability', 45,
        'reasoning', 'Chip responsável por ligar/desligar pode estar danificado.'
      )
    );
    v_estimated_time := '60-120 minutos';
    v_common_parts := jsonb_build_array(
      jsonb_build_object('part_name', 'IC de power', 'replacement_frequency', 'Média'),
      jsonb_build_object('part_name', 'Capacitores', 'replacement_frequency', 'Média'),
      jsonb_build_object('part_name', 'Bateria', 'replacement_frequency', 'Alta')
    );
    
  ELSIF v_category = 'Dano por Líquido' THEN
    v_probable_causes := jsonb_build_array(
      jsonb_build_object(
        'description', 'Oxidação e corrosão na placa-mãe',
        'probability', 85,
        'reasoning', 'Líquido causa oxidação que danifica trilhas e componentes da placa.'
      ),
      jsonb_build_object(
        'description', 'Curto-circuito em componentes',
        'probability', 70,
        'reasoning', 'Líquido conduz eletricidade, causando curtos que queimam componentes.'
      ),
      jsonb_build_object(
        'description', 'Dano em conectores e cabos flat',
        'probability', 50,
        'reasoning', 'Conectores oxidam rapidamente em contato com líquido.'
      )
    );
    v_estimated_time := '90-180 minutos';
    v_complexity := 'high';
    v_common_parts := jsonb_build_array(
      jsonb_build_object('part_name', 'Limpeza ultrassônica', 'replacement_frequency', 'Sempre'),
      jsonb_build_object('part_name', 'Componentes SMD', 'replacement_frequency', 'Variável'),
      jsonb_build_object('part_name', 'Placa-mãe', 'replacement_frequency', 'Casos graves')
    );
    
  ELSIF v_category = 'Software' THEN
    v_probable_causes := jsonb_build_array(
      jsonb_build_object(
        'description', 'Armazenamento cheio ou corrompido',
        'probability', 70,
        'reasoning', 'Falta de espaço ou setores ruins no armazenamento causam lentidão.'
      ),
      jsonb_build_object(
        'description', 'Aplicativos com problemas ou malware',
        'probability', 55,
        'reasoning', 'Apps mal otimizados ou malware consomem recursos excessivamente.'
      ),
      jsonb_build_object(
        'description', 'Sistema operacional corrompido',
        'probability', 40,
        'reasoning', 'Arquivos de sistema danificados causam travamentos e lentidão.'
      )
    );
    v_estimated_time := '30-90 minutos';
    v_complexity := 'low';
    
  ELSE
    -- Generic causes
    v_probable_causes := jsonb_build_array(
      jsonb_build_object(
        'description', 'Diagnóstico necessário para identificar causa',
        'probability', 50,
        'reasoning', 'Informações insuficientes para determinar causa específica.'
      )
    );
    v_estimated_time := '30-60 minutos';
  END IF;
  
  -- Generate suggested tests based on category
  v_suggested_tests := '[]'::jsonb;
  
  IF v_category = 'Bateria' THEN
    v_suggested_tests := jsonb_build_array(
      jsonb_build_object('description', 'Medir tensão da bateria com multímetro', 'expected_result', 'Tensão nominal (ex: 3.7V para Li-ion)'),
      jsonb_build_object('description', 'Testar com carregador original conhecido', 'expected_result', 'Equipamento deve carregar normalmente'),
      jsonb_build_object('description', 'Inspecionar conector de carga', 'expected_result', 'Sem danos físicos ou oxidação'),
      jsonb_build_object('description', 'Verificar corrente de carga', 'expected_result', 'Corrente adequada (ex: 1-2A)')
    );
  ELSIF v_category = 'Tela/Display' THEN
    v_suggested_tests := jsonb_build_array(
      jsonb_build_object('description', 'Inspeção visual da tela', 'expected_result', 'Sem trincas ou manchas'),
      jsonb_build_object('description', 'Testar touch screen em todas as áreas', 'expected_result', 'Resposta em toda superfície'),
      jsonb_build_object('description', 'Verificar conexão do cabo flat', 'expected_result', 'Cabo bem conectado e sem danos'),
      jsonb_build_object('description', 'Testar backlight (iluminação)', 'expected_result', 'Tela ilumina uniformemente')
    );
  ELSIF v_category = 'Hardware' THEN
    v_suggested_tests := jsonb_build_array(
      jsonb_build_object('description', 'Testar botão de power', 'expected_result', 'Botão responde ao pressionar'),
      jsonb_build_object('description', 'Verificar sinais de curto-circuito', 'expected_result', 'Sem componentes quentes ou queimados'),
      jsonb_build_object('description', 'Medir tensões principais da placa', 'expected_result', 'Tensões corretas (3.3V, 5V, etc)'),
      jsonb_build_object('description', 'Testar com bateria externa', 'expected_result', 'Equipamento liga com fonte externa')
    );
  ELSIF v_category = 'Dano por Líquido' THEN
    v_suggested_tests := jsonb_build_array(
      jsonb_build_object('description', 'Verificar indicadores de líquido', 'expected_result', 'Indicadores podem estar vermelhos'),
      jsonb_build_object('description', 'Inspecionar placa com lupa', 'expected_result', 'Identificar áreas oxidadas'),
      jsonb_build_object('description', 'Testar continuidade de trilhas', 'expected_result', 'Trilhas principais intactas'),
      jsonb_build_object('description', 'Limpar placa com álcool isopropílico', 'expected_result', 'Remover resíduos e oxidação')
    );
  ELSIF v_category = 'Software' THEN
    v_suggested_tests := jsonb_build_array(
      jsonb_build_object('description', 'Verificar espaço de armazenamento', 'expected_result', 'Pelo menos 10% livre'),
      jsonb_build_object('description', 'Iniciar em modo de segurança', 'expected_result', 'Sistema funciona normalmente'),
      jsonb_build_object('description', 'Verificar uso de CPU e memória', 'expected_result', 'Uso normal em idle (<30%)'),
      jsonb_build_object('description', 'Escanear por malware', 'expected_result', 'Sem ameaças detectadas')
    );
  ELSE
    v_suggested_tests := jsonb_build_array(
      jsonb_build_object('description', 'Realizar diagnóstico completo', 'expected_result', 'Identificar problema específico'),
      jsonb_build_object('description', 'Testar funcionalidades básicas', 'expected_result', 'Todas funcionam corretamente')
    );
  END IF;
  
  -- Generate technical observations
  v_technical_observations := jsonb_build_array();
  
  IF v_complexity = 'high' THEN
    v_technical_observations := v_technical_observations || jsonb_build_array(
      '⚠️ Reparo de alta complexidade - requer experiência técnica avançada'
    );
  END IF;
  
  IF v_category = 'Dano por Líquido' THEN
    v_technical_observations := v_technical_observations || jsonb_build_array(
      '💧 Dano por líquido pode ter efeitos progressivos - oxidação continua ao longo do tempo',
      '🔬 Limpeza ultrassônica recomendada para remover resíduos',
      '⏱️ Quanto mais rápido o atendimento, maiores as chances de recuperação'
    );
  END IF;
  
  IF v_category = 'Bateria' THEN
    v_technical_observations := v_technical_observations || jsonb_build_array(
      '🔋 Baterias de Li-ion degradam naturalmente após 300-500 ciclos de carga',
      '⚡ Sempre usar carregador original ou certificado para evitar danos'
    );
  END IF;
  
  IF v_category = 'Tela/Display' THEN
    v_technical_observations := v_technical_observations || jsonb_build_array(
      '📱 Telas são componentes frágeis - manuseio cuidadoso é essencial',
      '🔧 Substituição de tela geralmente resolve 90% dos problemas de display'
    );
  END IF;
  
  IF v_category = 'Hardware' THEN
    v_technical_observations := v_technical_observations || jsonb_build_array(
      '🔌 Problemas de hardware geralmente requerem diagnóstico com equipamento especializado',
      '⚠️ Curto-circuito pode danificar múltiplos componentes simultaneamente'
    );
  END IF;
  
  IF v_category = 'Software' THEN
    v_technical_observations := v_technical_observations || jsonb_build_array(
      '💻 Problemas de software geralmente têm solução mais simples e rápida',
      '🔄 Backup de dados recomendado antes de qualquer procedimento'
    );
  END IF;
  
  -- Add generic observation
  v_technical_observations := v_technical_observations || jsonb_build_array(
    '📋 Documentar todas as observações e testes realizados'
  );
  
  -- Build final result
  v_result := jsonb_build_object(
    'ok', true,
    'mode', 'IN_OS',
    'diagnosis', jsonb_build_object(
      'probable_causes', v_probable_causes,
      'suggested_tests', v_suggested_tests,
      'technical_observations', v_technical_observations,
      'complexity', v_complexity,
      'estimated_time', v_estimated_time,
      'common_parts', COALESCE(v_common_parts, '[]'::jsonb),
      'category', v_category
    ),
    'meta', jsonb_build_object(
      'method', 'RPC',
      'keywords_found', array_length(v_keywords, 1),
      'technical_terms', array_length(v_technical_terms, 1)
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error in standard format
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'diagnosis', jsonb_build_object(
      'probable_causes', '[]'::jsonb,
      'suggested_tests', '[]'::jsonb,
      'technical_observations', jsonb_build_array('Erro ao processar diagnóstico. Tente novamente.'),
      'complexity', 'medium'
    )
  );
END;
$$;

COMMENT ON FUNCTION get_ai_diagnostic IS 'Generate AI diagnostic suggestions for IN_OS mode without requiring JWT. Returns probable causes, suggested tests, and technical observations.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_ai_diagnostic TO anon, authenticated;