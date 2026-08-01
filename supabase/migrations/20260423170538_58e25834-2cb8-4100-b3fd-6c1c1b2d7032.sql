-- Trigger para forçar created_by = auth.uid() em visit_forms
DROP TRIGGER IF EXISTS set_created_by_visit_forms ON public.visit_forms;
CREATE TRIGGER set_created_by_visit_forms
BEFORE INSERT ON public.visit_forms
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by();

-- Trigger para forçar created_by = auth.uid() em feedbacks
DROP TRIGGER IF EXISTS set_created_by_feedbacks ON public.feedbacks;
CREATE TRIGGER set_created_by_feedbacks
BEFORE INSERT ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.set_created_by();