
-- 1. Corrigir politica do dashboard_layout
DROP POLICY IF EXISTS "Everyone can view dashboard layout" ON public.dashboard_layout;
CREATE POLICY "Authenticated users can view dashboard layout"
  ON public.dashboard_layout FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Adicionar politicas de UPDATE e DELETE para form_responses
CREATE POLICY "Admins can update form responses"
  ON public.form_responses FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete form responses"
  ON public.form_responses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
