-- Drop existing service orders policies
DROP POLICY IF EXISTS "Admins have full access to service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Clients can view their own orders" ON public.service_orders;

-- Recreate service orders policies with explicit INSERT permission for admins
CREATE POLICY "Admins can view all service_orders" ON public.service_orders
  FOR SELECT TO authenticated 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert service_orders" ON public.service_orders
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update service_orders" ON public.service_orders
  FOR UPDATE TO authenticated 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete service_orders" ON public.service_orders
  FOR DELETE TO authenticated 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients can view their own orders" ON public.service_orders
  FOR SELECT TO authenticated 
  USING (client_id = auth.uid());