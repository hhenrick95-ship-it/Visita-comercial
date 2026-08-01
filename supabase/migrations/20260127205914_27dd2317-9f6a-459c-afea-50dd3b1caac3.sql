-- =====================================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA
-- =====================================================

-- 1. CORRIGIR FUNÇÃO get_all_visits_for_dashboard
CREATE OR REPLACE FUNCTION public.get_all_visits_for_dashboard()
RETURNS SETOF visit_forms
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT * FROM visit_forms ORDER BY visit_date DESC;
  ELSE
    RETURN QUERY SELECT * FROM visit_forms 
    WHERE created_by = auth.uid() 
    ORDER BY visit_date DESC;
  END IF;
END;
$$;

-- 2. CORRIGIR FUNÇÃO get_all_feedbacks_for_dashboard
CREATE OR REPLACE FUNCTION public.get_all_feedbacks_for_dashboard()
RETURNS SETOF feedbacks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT * FROM feedbacks ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM feedbacks 
    WHERE created_by = auth.uid() 
    ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 3. CORRIGIR RLS DE visit_forms
DROP POLICY IF EXISTS "Users read own visit forms" ON public.visit_forms;
CREATE POLICY "Users read own visit forms" ON public.visit_forms
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
  );

-- 4. CORRIGIR RLS DE feedbacks
DROP POLICY IF EXISTS "Users read own feedbacks" ON public.feedbacks;
CREATE POLICY "Users read own feedbacks" ON public.feedbacks
  FOR SELECT USING (
    has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
  );

-- 5. RESTRINGIR ACESSO A FORMULÁRIOS
DROP POLICY IF EXISTS "Everyone can view active questions" ON public.form_questions;
CREATE POLICY "Authenticated users view active questions" ON public.form_questions
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone can view active sections" ON public.form_sections;
CREATE POLICY "Authenticated users view active sections" ON public.form_sections
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);