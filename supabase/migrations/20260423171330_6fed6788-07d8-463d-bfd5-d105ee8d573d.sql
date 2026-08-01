-- ============================================================
-- MULTI-FORM ENGINE: form_templates + form_submissions + extras
-- ============================================================

-- 1) Tabela de templates de formulário
CREATE TABLE IF NOT EXISTS public.form_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'FileText',
  color text DEFAULT 'primary',
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false, -- true = template do sistema (Visita), não pode ser deletado
  requires_geolocation boolean NOT NULL DEFAULT false,
  generates_pdf boolean NOT NULL DEFAULT true,
  ai_analysis_config jsonb NOT NULL DEFAULT '{"enabled": true, "types": ["summary","performance"]}'::jsonb,
  dashboard_config jsonb NOT NULL DEFAULT '{"show_kpis": true, "show_charts": true, "show_map": false}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage form templates"
  ON public.form_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved users view active templates"
  ON public.form_templates FOR SELECT
  TO authenticated
  USING (is_approved(auth.uid()) AND is_active = true);

CREATE POLICY "Block anonymous access to form_templates"
  ON public.form_templates FOR ALL
  TO anon
  USING (false);

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_team_daily_goals_updated_at();

-- 2) Insere o template "Visita" (sistema)
INSERT INTO public.form_templates (slug, name, description, icon, color, is_system, requires_geolocation, generates_pdf, dashboard_config, display_order)
VALUES (
  'visita',
  'Visita Comercial',
  'Formulário padrão de acompanhamento de visita comercial',
  'MapPin',
  'primary',
  true,
  true,
  true,
  '{"show_kpis": true, "show_charts": true, "show_map": true, "show_opportunities": true, "show_ruptures": true}'::jsonb,
  0
)
ON CONFLICT (slug) DO NOTHING;

-- 3) Adiciona template_id em form_sections
ALTER TABLE public.form_sections
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.form_templates(id) ON DELETE CASCADE;

-- Popula seções existentes com o template "visita"
UPDATE public.form_sections
SET template_id = (SELECT id FROM public.form_templates WHERE slug = 'visita')
WHERE template_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_form_sections_template_id ON public.form_sections(template_id);

-- 4) Adiciona campos novos em form_questions
ALTER TABLE public.form_questions
  ADD COLUMN IF NOT EXISTS identification_role text,
  ADD COLUMN IF NOT EXISTS metric_category text;

COMMENT ON COLUMN public.form_questions.identification_role IS 
  'Papel de identificação: manager, vendor, client_code, visit_date, address, latitude, longitude, etc. NULL = pergunta normal.';

-- 5) Cria tabela form_submissions (genérica para qualquer template novo)
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  created_by uuid,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  address text,
  geolocation_status text,
  geolocation_error text,
  pdf_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, -- guarda manager, vendor, client_code, etc extraídos
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users submit form submissions"
  ON public.form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (is_approved(auth.uid()));

CREATE POLICY "Users read own submissions"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "Users update own submissions"
  ON public.form_submissions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own submissions"
  ON public.form_submissions FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anonymous access to form_submissions"
  ON public.form_submissions FOR ALL
  TO anon
  USING (false);

-- Trigger: força created_by = auth.uid() (mesmo pattern de visit_forms/feedbacks)
CREATE TRIGGER set_created_by_form_submissions
  BEFORE INSERT ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON public.form_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_by ON public.form_submissions(created_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.form_submissions(submitted_at DESC);

-- 6) Adiciona submission_id em form_responses (nullable; visit_form_id continua para Visita)
ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.form_submissions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_responses_submission_id ON public.form_responses(submission_id);

-- 7) Mapeia identification_role nas perguntas existentes (Visita) por label
UPDATE public.form_questions
SET identification_role = CASE
  WHEN lower(label) LIKE '%data%visita%' OR lower(label) = 'data' THEN 'visit_date'
  WHEN lower(label) LIKE '%gestor%' OR lower(label) LIKE '%gerente%' OR lower(label) LIKE '%supervisor%' THEN 'manager'
  WHEN lower(label) LIKE '%rca%' OR lower(label) LIKE '%vendedor%' THEN 'vendor'
  WHEN lower(label) LIKE '%cliente%' OR lower(label) LIKE '%código%cliente%' THEN 'client_code'
  ELSE NULL
END
WHERE identification_role IS NULL;

-- 8) Função helper: lista templates ativos para o usuário
CREATE OR REPLACE FUNCTION public.get_active_form_templates()
RETURNS SETOF public.form_templates
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.form_templates
  WHERE is_active = true
  ORDER BY display_order ASC, name ASC;
$$;