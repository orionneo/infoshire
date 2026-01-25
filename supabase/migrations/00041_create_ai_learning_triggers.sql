-- =============================================
-- AI LEARNING TRIGGERS
-- Automatically capture knowledge events when OS is created/updated
-- =============================================

-- Function to capture knowledge event
CREATE OR REPLACE FUNCTION public.capture_ai_knowledge_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_type_val TEXT;
  raw_text_val TEXT;
  keywords TEXT[];
  auto_learn_enabled BOOLEAN;
BEGIN
  -- Check if auto-learning is enabled
  SELECT config_value::BOOLEAN INTO auto_learn_enabled
  FROM public.ai_config
  WHERE config_key = 'AUTO_LEARN_ENABLED' AND is_active = true;
  
  IF auto_learn_enabled IS NULL OR auto_learn_enabled = false THEN
    RETURN NEW;
  END IF;
  
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'OS_CREATE';
    raw_text_val := COALESCE(NEW.problem_description, '') || ' ' || 
                    COALESCE(NEW.equipment, '') || ' ' ||
                    COALESCE(NEW.brand, '') || ' ' ||
                    COALESCE(NEW.model, '');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      event_type_val := 'STATUS_CHANGE';
      raw_text_val := 'Status: ' || COALESCE(NEW.status::TEXT, '') || ' ' ||
                      COALESCE(NEW.problem_description, '');
    ELSIF OLD.problem_description IS DISTINCT FROM NEW.problem_description OR
          OLD.technical_notes IS DISTINCT FROM NEW.technical_notes THEN
      event_type_val := 'OS_UPDATE';
      raw_text_val := COALESCE(NEW.problem_description, '') || ' ' ||
                      COALESCE(NEW.technical_notes, '') || ' ' ||
                      COALESCE(NEW.equipment, '');
    ELSE
      -- No relevant changes, skip
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Skip if text is too short
  IF length(trim(raw_text_val)) < 10 THEN
    RETURN NEW;
  END IF;
  
  -- Extract keywords
  keywords := public.extract_keywords(raw_text_val);
  
  -- Insert knowledge event
  BEGIN
    INSERT INTO public.ai_knowledge_events (
      user_id,
      os_id,
      equipamento_tipo,
      marca,
      modelo,
      raw_text,
      event_type,
      normalized_terms,
      source,
      status
    ) VALUES (
      auth.uid(),
      NEW.id,
      NEW.equipment,
      NEW.brand,
      NEW.model,
      raw_text_val,
      event_type_val,
      keywords,
      'TECH',
      'PENDING'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO public.ai_errors (function_name, error_message, os_id)
    VALUES ('capture_ai_knowledge_event', SQLERRM, NEW.id);
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger on service_orders
DROP TRIGGER IF EXISTS trigger_capture_ai_knowledge ON public.service_orders;

CREATE TRIGGER trigger_capture_ai_knowledge
  AFTER INSERT OR UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_ai_knowledge_event();

-- =============================================
-- FUNCTION TO PROCESS PENDING EVENTS
-- (Can be called manually or by cron job)
-- =============================================

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
  normalized_term TEXT;
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
        normalized_term := public.normalize_text(term_text);
        
        -- Skip very short terms
        IF length(normalized_term) < 3 THEN
          CONTINUE;
        END IF;
        
        -- Check if term exists
        SELECT id INTO existing_term_id
        FROM public.ai_terms
        WHERE normalized_term = normalized_term;
        
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
              normalized_term,
              1,
              NOW(),
              ARRAY[event_record.equipamento_tipo]
            );
            new_terms := new_terms + 1;
          EXCEPTION WHEN unique_violation THEN
            -- Term was just created by another process, update it
            UPDATE public.ai_terms
            SET frequency = frequency + 1,
                last_seen = NOW(),
                equipment_types = array_append(equipment_types, event_record.equipamento_tipo)
            WHERE normalized_term = normalized_term;
          END;
        ELSE
          -- Update existing term
          UPDATE public.ai_terms
          SET frequency = frequency + 1,
              last_seen = NOW(),
              equipment_types = CASE
                WHEN event_record.equipamento_tipo = ANY(equipment_types) THEN equipment_types
                ELSE array_append(equipment_types, event_record.equipamento_tipo)
              END,
              updated_at = NOW()
          WHERE id = existing_term_id;
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

-- =============================================
-- FUNCTION TO BUILD SIMILAR CASES CACHE
-- =============================================

CREATE OR REPLACE FUNCTION public.build_similar_cases_cache(target_os_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_record RECORD;
  similar_record RECORD;
  target_keywords TEXT[];
  similar_keywords TEXT[];
  matching_terms TEXT[];
  similarity NUMERIC;
  threshold NUMERIC;
  max_cases INTEGER;
  cases_found INTEGER := 0;
BEGIN
  -- Get configuration
  SELECT config_value::NUMERIC INTO threshold
  FROM public.ai_config
  WHERE config_key = 'SIMILARITY_THRESHOLD';
  
  SELECT config_value::INTEGER INTO max_cases
  FROM public.ai_config
  WHERE config_key = 'MAX_SIMILAR_CASES';
  
  threshold := COALESCE(threshold, 0.6);
  max_cases := COALESCE(max_cases, 5);
  
  -- Get target OS
  SELECT * INTO target_record
  FROM public.service_orders
  WHERE id = target_os_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Extract keywords from target
  target_keywords := public.extract_keywords(
    COALESCE(target_record.problem_description, '') || ' ' ||
    COALESCE(target_record.technical_notes, '')
  );
  
  -- Delete old cache entries
  DELETE FROM public.ai_similar_cases WHERE os_id = target_os_id;
  
  -- Find similar cases
  FOR similar_record IN
    SELECT *
    FROM public.service_orders
    WHERE id != target_os_id
      AND equipment = target_record.equipment
      AND status IN ('completed', 'delivered')
    ORDER BY created_at DESC
    LIMIT 100
  LOOP
    -- Extract keywords from similar case
    similar_keywords := public.extract_keywords(
      COALESCE(similar_record.problem_description, '') || ' ' ||
      COALESCE(similar_record.technical_notes, '')
    );
    
    -- Find matching terms
    matching_terms := ARRAY(
      SELECT unnest(target_keywords)
      INTERSECT
      SELECT unnest(similar_keywords)
    );
    
    -- Calculate simple similarity score
    IF array_length(target_keywords, 1) > 0 THEN
      similarity := CAST(array_length(matching_terms, 1) AS NUMERIC) / 
                    CAST(array_length(target_keywords, 1) AS NUMERIC);
    ELSE
      similarity := 0;
    END IF;
    
    -- If similarity is above threshold, cache it
    IF similarity >= threshold AND array_length(matching_terms, 1) > 0 THEN
      INSERT INTO public.ai_similar_cases (
        os_id,
        similar_os_id,
        similarity_score,
        matching_terms,
        anonymized_description,
        anonymized_solution
      ) VALUES (
        target_os_id,
        similar_record.id,
        similarity,
        matching_terms,
        substring(similar_record.problem_description, 1, 200),
        substring(COALESCE(similar_record.technical_notes, 'Sem detalhes'), 1, 200)
      );
      
      cases_found := cases_found + 1;
      
      -- Stop if we have enough cases
      IF cases_found >= max_cases THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN cases_found;
END;
$$;

COMMENT ON FUNCTION public.capture_ai_knowledge_event() IS 'Captura automaticamente eventos de aprendizado ao criar/atualizar OS';
COMMENT ON FUNCTION public.process_ai_knowledge_events(INTEGER) IS 'Processa eventos pendentes e atualiza glossário de termos';
COMMENT ON FUNCTION public.build_similar_cases_cache(UUID) IS 'Constrói cache de casos similares para uma OS específica';