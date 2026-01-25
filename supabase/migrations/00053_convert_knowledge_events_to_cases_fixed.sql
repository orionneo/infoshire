-- Function to convert processed knowledge events into documented cases
CREATE OR REPLACE FUNCTION convert_knowledge_events_to_documented_cases(
  event_ids UUID[] DEFAULT NULL,
  auto_approve BOOLEAN DEFAULT true
)
RETURNS TABLE(
  cases_created INTEGER,
  events_converted UUID[]
) AS $$
DECLARE
  cases_count INTEGER := 0;
  converted_ids UUID[] := '{}';
  event_record RECORD;
BEGIN
  -- If no specific event IDs provided, get all PROCESSED events not yet converted
  IF event_ids IS NULL THEN
    FOR event_record IN
      SELECT 
        ake.id,
        ake.user_id,
        ake.equipamento_tipo,
        ake.marca,
        ake.modelo,
        ake.problema_descricao,
        ake.solucao_aplicada,
        ake.causa_raiz,
        ake.tags_solucao,
        ake.metadata
      FROM ai_knowledge_events ake
      WHERE ake.status = 'PROCESSED'
        AND ake.problema_descricao IS NOT NULL
        AND ake.solucao_aplicada IS NOT NULL
        AND LENGTH(ake.problema_descricao) > 5
        AND LENGTH(ake.solucao_aplicada) > 10
        AND NOT EXISTS (
          SELECT 1 FROM ai_documented_cases adc
          WHERE adc.problem_description = ake.problema_descricao
            AND adc.equipment_type = ake.equipamento_tipo
        )
      ORDER BY ake.created_at DESC
      LIMIT 100
    LOOP
      -- Create documented case from knowledge event
      INSERT INTO ai_documented_cases (
        created_by,
        title,
        equipment_type,
        brand,
        model,
        problem_description,
        solution_description,
        tags,
        difficulty_level,
        estimated_time_minutes,
        notes,
        is_active,
        is_verified,
        verified_by,
        verified_at
      )
      VALUES (
        event_record.user_id,
        CASE 
          WHEN event_record.equipamento_tipo IS NOT NULL THEN 
            'Reparo de ' || event_record.equipamento_tipo || 
            CASE WHEN event_record.problema_descricao IS NOT NULL 
              THEN ' - ' || LEFT(event_record.problema_descricao, 50)
              ELSE ''
            END
          ELSE 'Caso documentado'
        END,
        event_record.equipamento_tipo,
        event_record.marca,
        event_record.modelo,
        event_record.problema_descricao,
        event_record.solucao_aplicada || 
        CASE 
          WHEN event_record.causa_raiz IS NOT NULL AND LENGTH(event_record.causa_raiz) > 0
          THEN E'\n\n**Causa raiz:** ' || event_record.causa_raiz
          ELSE ''
        END,
        COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[]),
        CASE 
          WHEN array_length(event_record.tags_solucao, 1) <= 2 THEN 'easy'
          WHEN array_length(event_record.tags_solucao, 1) <= 4 THEN 'medium'
          ELSE 'hard'
        END,
        CASE 
          WHEN 'Troca de Peça' = ANY(COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[])) THEN 60
          WHEN 'Limpeza' = ANY(COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[])) THEN 30
          WHEN 'Reparo' = ANY(COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[])) THEN 90
          ELSE 45
        END,
        'Caso extraído automaticamente de aprendizado documentado em ordem de serviço.',
        true,
        auto_approve,
        CASE WHEN auto_approve THEN event_record.user_id ELSE NULL END,
        CASE WHEN auto_approve THEN now() ELSE NULL END
      );
      
      cases_count := cases_count + 1;
      converted_ids := array_append(converted_ids, event_record.id);
      
      -- Mark event as converted
      UPDATE ai_knowledge_events
      SET 
        status = 'CONVERTED',
        processed_at = now(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('converted_at', now(), 'converted_to_case', true)
      WHERE id = event_record.id;
    END LOOP;
  ELSE
    -- Convert specific events
    FOR event_record IN
      SELECT 
        ake.id,
        ake.user_id,
        ake.equipamento_tipo,
        ake.marca,
        ake.modelo,
        ake.problema_descricao,
        ake.solucao_aplicada,
        ake.causa_raiz,
        ake.tags_solucao,
        ake.metadata
      FROM ai_knowledge_events ake
      WHERE ake.id = ANY(event_ids)
        AND ake.status IN ('PROCESSED', 'PENDING')
        AND ake.problema_descricao IS NOT NULL
        AND ake.solucao_aplicada IS NOT NULL
    LOOP
      -- Create documented case from knowledge event
      INSERT INTO ai_documented_cases (
        created_by,
        title,
        equipment_type,
        brand,
        model,
        problem_description,
        solution_description,
        tags,
        difficulty_level,
        estimated_time_minutes,
        notes,
        is_active,
        is_verified,
        verified_by,
        verified_at
      )
      VALUES (
        event_record.user_id,
        CASE 
          WHEN event_record.equipamento_tipo IS NOT NULL THEN 
            'Reparo de ' || event_record.equipamento_tipo || 
            CASE WHEN event_record.problema_descricao IS NOT NULL 
              THEN ' - ' || LEFT(event_record.problema_descricao, 50)
              ELSE ''
            END
          ELSE 'Caso documentado'
        END,
        event_record.equipamento_tipo,
        event_record.marca,
        event_record.modelo,
        event_record.problema_descricao,
        event_record.solucao_aplicada || 
        CASE 
          WHEN event_record.causa_raiz IS NOT NULL AND LENGTH(event_record.causa_raiz) > 0
          THEN E'\n\n**Causa raiz:** ' || event_record.causa_raiz
          ELSE ''
        END,
        COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[]),
        CASE 
          WHEN array_length(event_record.tags_solucao, 1) <= 2 THEN 'easy'
          WHEN array_length(event_record.tags_solucao, 1) <= 4 THEN 'medium'
          ELSE 'hard'
        END,
        CASE 
          WHEN 'Troca de Peça' = ANY(COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[])) THEN 60
          WHEN 'Limpeza' = ANY(COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[])) THEN 30
          WHEN 'Reparo' = ANY(COALESCE(event_record.tags_solucao, ARRAY[]::TEXT[])) THEN 90
          ELSE 45
        END,
        'Caso extraído automaticamente de aprendizado documentado em ordem de serviço.',
        true,
        auto_approve,
        CASE WHEN auto_approve THEN event_record.user_id ELSE NULL END,
        CASE WHEN auto_approve THEN now() ELSE NULL END
      )
      ON CONFLICT DO NOTHING;
      
      cases_count := cases_count + 1;
      converted_ids := array_append(converted_ids, event_record.id);
      
      -- Mark event as converted
      UPDATE ai_knowledge_events
      SET 
        status = 'CONVERTED',
        processed_at = now(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('converted_at', now(), 'converted_to_case', true)
      WHERE id = event_record.id;
    END LOOP;
  END IF;

  RETURN QUERY SELECT cases_count, converted_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION convert_knowledge_events_to_documented_cases IS 'Converts processed AI knowledge events into documented cases for the knowledge base';

-- Execute conversion for existing processed events
SELECT * FROM convert_knowledge_events_to_documented_cases(NULL, true);