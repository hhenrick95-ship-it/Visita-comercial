-- Create form_sections table
CREATE TABLE public.form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create form_questions table
CREATE TABLE public.form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.form_sections(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'textarea', 'radio', 'select', 'slider', 'checkbox', 'image_upload', 'date')),
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  options JSONB,
  slider_config JSONB,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  conditional_logic JSONB,
  is_active BOOLEAN DEFAULT true,
  is_chart_metric BOOLEAN DEFAULT false,
  metric_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create form_responses table
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_form_id UUID REFERENCES public.visit_forms(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.form_questions(id),
  response_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create storage bucket for form images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('form-images', 'form-images', true);

-- Enable RLS on all tables
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_sections
CREATE POLICY "Everyone can view active sections"
ON public.form_sections FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage sections"
ON public.form_sections FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for form_questions
CREATE POLICY "Everyone can view active questions"
ON public.form_questions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage questions"
ON public.form_questions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for form_responses
CREATE POLICY "Approved users read responses"
ON public.form_responses FOR SELECT
USING (is_approved(auth.uid()));

CREATE POLICY "Approved users submit responses"
ON public.form_responses FOR INSERT
WITH CHECK (is_approved(auth.uid()));

-- Storage policies for form-images bucket
CREATE POLICY "Anyone can view form images"
ON storage.objects FOR SELECT
USING (bucket_id = 'form-images');

CREATE POLICY "Approved users can upload form images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'form-images' AND is_approved(auth.uid()));

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'form-images' AND is_approved(auth.uid()));

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'form-images' AND is_approved(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_form_questions_section ON public.form_questions(section_id);
CREATE INDEX idx_form_questions_active ON public.form_questions(is_active);
CREATE INDEX idx_form_responses_visit ON public.form_responses(visit_form_id);
CREATE INDEX idx_form_responses_question ON public.form_responses(question_id);

-- Seed with current form structure
INSERT INTO public.form_sections (title, description, display_order) VALUES
('Identificação', 'Informações básicas da visita', 1),
('Condições Gerais da Loja', 'Avaliação das condições do ponto de venda', 2),
('Execução PDV', 'Análise da execução no ponto de venda', 3),
('Equipe de Campo', 'Avaliação do desempenho da equipe', 4),
('Relacionamento e Oportunidades', 'Níveis de relacionamento e oportunidades identificadas', 5),
('Documentação Visual', 'Anexar fotos da visita', 6);

-- Get section IDs and insert questions
DO $$
DECLARE
  section_id_1 UUID;
  section_id_2 UUID;
  section_id_3 UUID;
  section_id_4 UUID;
  section_id_5 UUID;
  section_id_6 UUID;
BEGIN
  SELECT id INTO section_id_1 FROM public.form_sections WHERE display_order = 1;
  SELECT id INTO section_id_2 FROM public.form_sections WHERE display_order = 2;
  SELECT id INTO section_id_3 FROM public.form_sections WHERE display_order = 3;
  SELECT id INTO section_id_4 FROM public.form_sections WHERE display_order = 4;
  SELECT id INTO section_id_5 FROM public.form_sections WHERE display_order = 5;
  SELECT id INTO section_id_6 FROM public.form_sections WHERE display_order = 6;

  -- Section 1: Identificação
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, display_order) VALUES
  (section_id_1, 'date', 'Data da Visita', true, 1),
  (section_id_1, 'text', 'Gestor', true, 2),
  (section_id_1, 'text', 'RCA Acompanhado', true, 3),
  (section_id_1, 'text', 'Código do Cliente', true, 4);

  -- Section 2: Condições Gerais (radio questions)
  INSERT INTO public.form_questions (section_id, question_type, label, options, is_required, display_order, is_chart_metric, metric_name) VALUES
  (section_id_2, 'radio', 'Preços estão visíveis e corretos?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 1, true, 'Preços Corretos'),
  (section_id_2, 'radio', 'Tem ativação/promoção?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 2, true, 'Promoções Ativas'),
  (section_id_2, 'radio', 'Tem material de merchandising?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 3, true, 'Material Merchandising'),
  (section_id_2, 'radio', 'Tem brinde promocional?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 4, true, 'Brindes');

  -- Section 3: Execução PDV (radio question)
  INSERT INTO public.form_questions (section_id, question_type, label, options, is_required, display_order, is_chart_metric, metric_name) VALUES
  (section_id_3, 'radio', 'Sortimento adequado disponível?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 1, true, 'Sortimento Adequado');
  
  -- Section 3: Execução PDV (textarea question)
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, display_order) VALUES
  (section_id_3, 'textarea', 'Descrição de rupturas (se houver)', false, 2);

  -- Section 4: Equipe de Campo (radio questions)
  INSERT INTO public.form_questions (section_id, question_type, label, options, is_required, display_order) VALUES
  (section_id_4, 'radio', 'Vendedor segue frequência de visita?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 1),
  (section_id_4, 'radio', 'Vendedor aplicou positivação?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 2);
  
  -- Section 4: Equipe de Campo (textarea question)
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, display_order) VALUES
  (section_id_4, 'textarea', 'Observações sobre o vendedor', false, 3);

  -- Section 5: Relacionamento e Oportunidades (slider questions)
  INSERT INTO public.form_questions (section_id, question_type, label, slider_config, is_required, display_order, is_chart_metric, metric_name) VALUES
  (section_id_5, 'slider', 'Nível de Relacionamento', '{"min":1,"max":5,"step":1}'::jsonb, true, 1, true, 'Relacionamento'),
  (section_id_5, 'slider', 'Nível de Execução', '{"min":1,"max":5,"step":1}'::jsonb, true, 2, true, 'Execução'),
  (section_id_5, 'slider', 'Nível de Entrega', '{"min":1,"max":5,"step":1}'::jsonb, true, 3, true, 'Entrega');

  -- Section 5: Relacionamento e Oportunidades (radio questions)
  INSERT INTO public.form_questions (section_id, question_type, label, options, is_required, display_order, is_chart_metric, metric_name) VALUES
  (section_id_5, 'radio', 'Tem oportunidade de expansão de mix?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 4, true, 'Expansão Mix'),
  (section_id_5, 'radio', 'Tem oportunidade de melhoria de visibilidade?', '[{"value":"sim","label":"Sim"},{"value":"nao","label":"Não"}]'::jsonb, true, 5, true, 'Melhoria Visibilidade');
  
  -- Section 5: Relacionamento e Oportunidades (textarea question)
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, display_order) VALUES
  (section_id_5, 'textarea', 'Comentários Adicionais', false, 6);

  -- Section 6: Documentação Visual
  INSERT INTO public.form_questions (section_id, question_type, label, description, is_required, display_order) VALUES
  (section_id_6, 'image_upload', 'Fotos da Visita', 'Anexe fotos do ponto de venda (máximo 10 imagens)', false, 1);
END $$;