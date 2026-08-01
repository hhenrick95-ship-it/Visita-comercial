
-- 1. Harden is_approved to only recognize known approved roles
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'gestor'::app_role, 'usuario'::app_role)
  )
$$;

-- 2. form_responses: scope SELECT to admin or owner of the parent form
DROP POLICY IF EXISTS "Approved users read responses" ON public.form_responses;
CREATE POLICY "Users read own or admin reads all responses"
ON public.form_responses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (visit_form_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.visit_forms vf
    WHERE vf.id = form_responses.visit_form_id AND vf.created_by = auth.uid()
  ))
  OR (submission_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.form_submissions fs
    WHERE fs.id = form_responses.submission_id AND fs.created_by = auth.uid()
  ))
);

-- 3. visit-pdfs storage: restrict to admin or uploader (owner)
DROP POLICY IF EXISTS "Authenticated users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;

CREATE POLICY "Users upload own visit PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visit-pdfs' AND owner = auth.uid());

CREATE POLICY "Owner or admin can view visit PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'visit-pdfs'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Owner or admin can update visit PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'visit-pdfs'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Owner or admin can delete visit PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'visit-pdfs'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- 4. form-images storage: keep SELECT broad for approved users (PDFs/Dashboard need cross-user view),
--    but restrict UPDATE/DELETE to uploader or admin
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Approved users delete form images" ON storage.objects;

CREATE POLICY "Owner or admin can update form images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'form-images'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Owner or admin can delete form images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'form-images'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- 5. feedback_templates: scope all policies to authenticated, block anonymous
DROP POLICY IF EXISTS "Users can view public templates and own" ON public.feedback_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON public.feedback_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.feedback_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.feedback_templates;
DROP POLICY IF EXISTS "Admins manage all templates" ON public.feedback_templates;
DROP POLICY IF EXISTS "Block anonymous access to feedback_templates" ON public.feedback_templates;

CREATE POLICY "Auth users view public or own templates"
ON public.feedback_templates FOR SELECT TO authenticated
USING (is_public = true OR created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth users create own templates"
ON public.feedback_templates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Auth users update own templates"
ON public.feedback_templates FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth users delete own templates"
ON public.feedback_templates FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Revoke EXECUTE from anon on SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.get_unified_visits_for_dashboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_feedbacks_for_dashboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_visits_for_dashboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_managers_current_month() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_form_templates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_visits_count_for_goal(text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_must_reset_password(text) FROM anon;
