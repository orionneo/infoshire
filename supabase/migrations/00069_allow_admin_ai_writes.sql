-- Preserve valid admin AI workflows after administrative RPCs are switched to SECURITY INVOKER.

CREATE POLICY "Admins can manage ai terms"
ON public.ai_terms
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ai web sources"
ON public.ai_web_sources
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
