-- Harden admin access control after production authorization bypass report.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role = 'admin'::public.user_role
  );
$$;

-- Public approval links must not expose every order with a non-null token.
DROP POLICY IF EXISTS "Allow public to view orders by approval token" ON public.service_orders;
DROP POLICY IF EXISTS "Allow public to approve orders by token" ON public.service_orders;
DROP POLICY IF EXISTS "Allow public insert for approvals" ON public.approval_history;
DROP POLICY IF EXISTS "Allow public to insert approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Authenticated users can insert approval history" ON public.approval_history;

CREATE POLICY "Admins can insert approval history"
ON public.approval_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients can insert approval history for own orders"
ON public.approval_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_orders so
    WHERE so.id = approval_history.order_id
      AND so.client_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.get_budget_approval_order(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 24 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', so.id,
    'order_number', so.order_number,
    'client_id', so.client_id,
    'equipment', so.equipment,
    'problem_description', so.problem_description,
    'serial_number', so.serial_number,
    'status', so.status,
    'labor_cost', so.labor_cost,
    'parts_cost', so.parts_cost,
    'total_cost', so.total_cost,
    'budget_notes', so.budget_notes,
    'budget_approved', so.budget_approved,
    'approved_at', so.approved_at,
    'discount_amount', so.discount_amount,
    'discount_reason', so.discount_reason,
    'client', jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'phone', p.phone
    )
  )
  INTO result
  FROM public.service_orders so
  INNER JOIN public.profiles p ON p.id = so.client_id
  WHERE so.approval_token = trim(p_token)
  LIMIT 1;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_budget_approval(
  p_token text,
  p_approved boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order public.service_orders%ROWTYPE;
  subtotal numeric;
  discount_amount numeric;
  total_final numeric;
  next_status public.order_status;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 24 THEN
    RAISE EXCEPTION 'Invalid approval token' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO target_order
  FROM public.service_orders
  WHERE approval_token = trim(p_token)
  LIMIT 1;

  IF target_order.id IS NULL THEN
    RAISE EXCEPTION 'Approval token not found' USING ERRCODE = 'P0002';
  END IF;

  subtotal := COALESCE(target_order.labor_cost, 0) + COALESCE(target_order.parts_cost, 0);
  discount_amount := COALESCE(target_order.discount_amount, 0);
  total_final := GREATEST(subtotal - discount_amount, 0);
  next_status := CASE
    WHEN p_approved THEN 'in_repair'::public.order_status
    ELSE 'analyzing'::public.order_status
  END;

  IF p_approved THEN
    INSERT INTO public.approval_history (
      order_id,
      labor_cost,
      parts_cost,
      total_cost,
      subtotal_cost,
      discount_amount,
      discount_reason,
      total_final_cost,
      approved_at,
      notes,
      admin_notified,
      admin_viewed
    )
    VALUES (
      target_order.id,
      target_order.labor_cost,
      target_order.parts_cost,
      target_order.total_cost,
      subtotal,
      discount_amount,
      target_order.discount_reason,
      total_final,
      now(),
      'Orcamento aprovado pelo cliente via link de aprovacao',
      false,
      false
    );
  END IF;

  UPDATE public.service_orders
  SET
    budget_approved = p_approved,
    approved_at = CASE WHEN p_approved THEN now() ELSE approved_at END,
    status = next_status,
    updated_at = now()
  WHERE id = target_order.id;

  INSERT INTO public.order_status_history (order_id, status, notes, created_by)
  VALUES (
    target_order.id,
    next_status,
    CASE
      WHEN p_approved THEN 'Orcamento aprovado pelo cliente via link de aprovacao'
      ELSE 'Orcamento recusado pelo cliente via link'
    END,
    target_order.client_id
  );

  RETURN public.get_budget_approval_order(p_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_budget_approval_order(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_budget_approval(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_budget_approval_order(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_budget_approval(text, boolean) TO anon, authenticated;

-- Admin-only AI operational tables. Public/helper RPCs can expose curated data.
DROP POLICY IF EXISTS "Allow authenticated read ai_events" ON public.ai_knowledge_events;
DROP POLICY IF EXISTS "Allow authenticated read ai_errors" ON public.ai_errors;
DROP POLICY IF EXISTS "Allow authenticated read ai_config" ON public.ai_config;
DROP POLICY IF EXISTS "Allow authenticated read ai_similar" ON public.ai_similar_cases;

CREATE POLICY "Admins can manage ai knowledge events"
ON public.ai_knowledge_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ai errors"
ON public.ai_errors
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ai config"
ON public.ai_config
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ai similar cases"
ON public.ai_similar_cases
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Make administrative RPCs obey RLS instead of bypassing it for non-admin callers.
ALTER FUNCTION IF EXISTS public.process_ai_knowledge_events(integer) SECURITY INVOKER;
ALTER FUNCTION IF EXISTS public.build_similar_cases_cache(uuid) SECURITY INVOKER;
ALTER FUNCTION IF EXISTS public.convert_knowledge_events_to_documented_cases(uuid[], boolean) SECURITY INVOKER;
ALTER FUNCTION IF EXISTS public.extract_cases_from_service_orders() SECURITY INVOKER;
ALTER FUNCTION IF EXISTS public.get_knowledge_contribution_stats() SECURITY INVOKER;
