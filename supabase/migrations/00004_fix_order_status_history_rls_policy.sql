-- Drop existing order_status_history policies
DROP POLICY IF EXISTS "Admins have full access to order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "Clients can view history of their orders" ON public.order_status_history;

-- Recreate order_status_history policies with explicit permissions
CREATE POLICY "Admins can view all order_status_history" ON public.order_status_history
  FOR SELECT TO authenticated 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert order_status_history" ON public.order_status_history
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update order_status_history" ON public.order_status_history
  FOR UPDATE TO authenticated 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete order_status_history" ON public.order_status_history
  FOR DELETE TO authenticated 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view history of their orders" ON public.order_status_history
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = order_id AND so.client_id = auth.uid()
    )
  );