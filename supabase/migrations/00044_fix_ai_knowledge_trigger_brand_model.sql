-- Fix the capture_ai_knowledge_event function to not reference brand/model
CREATE OR REPLACE FUNCTION capture_ai_knowledge_event()
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
    -- Only use fields that exist in service_orders table
    raw_text_val := COALESCE(NEW.problem_description, '') || ' ' || 
                    COALESCE(NEW.equipment, '');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      event_type_val := 'STATUS_CHANGE';
      raw_text_val := 'Status: ' || COALESCE(NEW.status::TEXT, '') || ' ' ||
                      COALESCE(NEW.problem_description, '');
    ELSIF OLD.problem_description IS DISTINCT FROM NEW.problem_description THEN
      event_type_val := 'OS_UPDATE';
      raw_text_val := COALESCE(NEW.problem_description, '') || ' ' ||
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
  
  -- Insert knowledge event (without brand/model since they don't exist in service_orders)
  BEGIN
    INSERT INTO public.ai_knowledge_events (
      user_id,
      os_id,
      equipamento_tipo,
      raw_text,
      event_type,
      normalized_terms,
      source,
      status
    ) VALUES (
      auth.uid(),
      NEW.id,
      NEW.equipment,
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

COMMENT ON FUNCTION capture_ai_knowledge_event IS 'Capture AI knowledge events from service orders. Fixed to not reference non-existent brand/model columns.';