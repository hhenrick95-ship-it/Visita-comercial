DROP POLICY IF EXISTS "Authenticated users can read documentation" ON public.system_documentation;
CREATE POLICY "Approved users can read documentation" ON public.system_documentation FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view dashboard layout" ON public.dashboard_layout;
CREATE POLICY "Approved users can view dashboard layout" ON public.dashboard_layout FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));