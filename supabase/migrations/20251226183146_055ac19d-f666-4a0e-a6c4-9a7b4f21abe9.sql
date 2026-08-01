-- Adicionar coluna created_by em visit_forms
ALTER TABLE public.visit_forms ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Adicionar coluna created_by em feedbacks  
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Criar função para definir created_by automaticamente
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para visit_forms
DROP TRIGGER IF EXISTS set_visit_forms_created_by ON public.visit_forms;
CREATE TRIGGER set_visit_forms_created_by
  BEFORE INSERT ON public.visit_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- Trigger para feedbacks
DROP TRIGGER IF EXISTS set_feedbacks_created_by ON public.feedbacks;
CREATE TRIGGER set_feedbacks_created_by
  BEFORE INSERT ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- Remover políticas antigas de visit_forms
DROP POLICY IF EXISTS "Approved users read visit forms" ON public.visit_forms;
DROP POLICY IF EXISTS "Users can update own visit forms" ON public.visit_forms;
DROP POLICY IF EXISTS "Users can delete own visit forms" ON public.visit_forms;

-- Criar novas políticas para visit_forms
CREATE POLICY "Users read own visit forms" ON public.visit_forms
  FOR SELECT USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR created_by IS NULL
  );

CREATE POLICY "Users update own visit forms" ON public.visit_forms
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users delete own visit forms" ON public.visit_forms
  FOR DELETE USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Remover política antiga de feedbacks
DROP POLICY IF EXISTS "Approved users read feedbacks" ON public.feedbacks;

-- Criar novas políticas para feedbacks
CREATE POLICY "Users read own feedbacks" ON public.feedbacks
  FOR SELECT USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR created_by IS NULL
  );

-- Função SECURITY DEFINER para Dashboard buscar todas as visitas
CREATE OR REPLACE FUNCTION public.get_all_visits_for_dashboard()
RETURNS SETOF visit_forms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM visit_forms
  ORDER BY visit_date DESC;
$$;

-- Função para Dashboard buscar todos os feedbacks
CREATE OR REPLACE FUNCTION public.get_all_feedbacks_for_dashboard()
RETURNS SETOF feedbacks
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM feedbacks
  ORDER BY created_at DESC;
$$;