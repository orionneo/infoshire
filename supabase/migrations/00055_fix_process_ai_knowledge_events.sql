-- Fix ambiguous column reference in process_ai_knowledge_events
CREATE OR REPLACE FUNCTION public.process_ai_knowledge_events(batch_size INTEGER DEFAULT 50)
RETURNS TABLE (
  processed_count INTEGER,
  new_terms_count INTEGER,
  errors_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_record RECORD;
  term_text TEXT;
  normalized_term_var TEXT;
  processed INTEGER := 0;
  new_terms INTEGER := 0;
  errors INTEGER := 0;
  existing_term_id UUID;
BEGIN
  -- Process pending events
  FOR event_record IN
    SELECT * FROM public.ai_knowledge_events
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT batch_size
  LOOP
    BEGIN
      -- Process each term in the event
      FOREACH term_text IN ARRAY event_record.normalized_terms
      LOOP
        normalized_term_var := public.normalize_text(term_text);
        
        -- Skip very short terms
        IF length(normalized_term_var) < 3 THEN
          CONTINUE;
        END IF;
        
        -- Check if term exists
        SELECT t.id INTO existing_term_id
        FROM public.ai_terms t
        WHERE t.normalized_term = normalized_term_var;
        
        IF existing_term_id IS NULL THEN
          -- Create new term
          BEGIN
            INSERT INTO public.ai_terms (
              term,
              normalized_term,
              frequency,
              last_seen,
              equipment_types
            ) VALUES (
              term_text,
              normalized_term_var,
              1,
              NOW(),
              ARRAY[event_record.equipamento_tipo]
            );
            new_terms := new_terms + 1;
          EXCEPTION WHEN unique_violation THEN
            -- Term was just created by another process, update it
            UPDATE public.ai_terms t
            SET frequency = t.frequency + 1,
                last_seen = NOW(),
                equipment_types = array_append(t.equipment_types, event_record.equipamento_tipo)
            WHERE t.normalized_term = normalized_term_var;
          END;
        ELSE
          -- Update existing term
          UPDATE public.ai_terms t
          SET frequency = t.frequency + 1,
              last_seen = NOW(),
              equipment_types = CASE
                WHEN event_record.equipamento_tipo = ANY(t.equipment_types) THEN t.equipment_types
                ELSE array_append(t.equipment_types, event_record.equipamento_tipo)
              END,
              updated_at = NOW()
          WHERE t.id = existing_term_id;
        END IF;
      END LOOP;
      
      -- Mark event as processed
      UPDATE public.ai_knowledge_events
      SET status = 'PROCESSED',
          processed_at = NOW()
      WHERE id = event_record.id;
      
      processed := processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error and mark event as failed
      INSERT INTO public.ai_errors (
        function_name,
        error_message,
        error_stack,
        os_id,
        input_snapshot
      ) VALUES (
        'process_ai_knowledge_events',
        SQLERRM,
        SQLSTATE,
        event_record.os_id,
        jsonb_build_object('event_id', event_record.id)
      );
      
      errors := errors + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed, new_terms, errors;
END;
$$;

COMMENT ON FUNCTION public.process_ai_knowledge_events IS 'Processes pending AI knowledge events and extracts terms';

-- Mark existing errors as resolved
UPDATE ai_errors
SET resolved = true,
    resolved_at = now()
WHERE function_name = 'process_ai_knowledge_events'
  AND error_message = 'column reference "normalized_term" is ambiguous'
  AND resolved = false;