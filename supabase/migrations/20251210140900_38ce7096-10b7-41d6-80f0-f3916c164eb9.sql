-- Add foreign key constraint with CASCADE DELETE
ALTER TABLE public.feedbacks 
ADD CONSTRAINT feedbacks_visit_form_id_fkey 
FOREIGN KEY (visit_form_id) 
REFERENCES public.visit_forms(id) 
ON DELETE CASCADE;

-- Admin can update feedbacks
CREATE POLICY "Admins can update feedbacks" 
ON public.feedbacks 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete feedbacks
CREATE POLICY "Admins can delete feedbacks" 
ON public.feedbacks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));