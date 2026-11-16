ALTER TABLE public.form_questions DROP CONSTRAINT IF EXISTS form_questions_question_type_check;

ALTER TABLE public.form_questions ADD CONSTRAINT form_questions_question_type_check
  CHECK (question_type = ANY (ARRAY[
    'text','textarea','radio','select','multi_select','slider','checkbox','date',
    'image_upload','team_select','vendor_select','client_select','client_info'
  ]));

DO $$
DECLARE
  v_template uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_q_client uuid;
  v_m text;
  v_i int := 0;
  v_metrics text[] := ARRAY[
    'Atendimento do Vendedor',
    'Frequência de Atendimento',
    'Execução de Materiais',
    'Frequência de Execução',
    'Competitividade de Preços',
    'Condições de Pagamento',
    'Qualidade de Negociação',
    'Conhecimento do Vendedor',
    'Trocas e Avarias',
    'Disponibilidade de Produtos',
    'Ruptura',
    'Tempo de Entrega'
  ];
BEGIN
  INSERT INTO public.form_templates
    (name, slug, description, icon, color, is_active, is_system, requires_geolocation, generates_pdf, display_order)
  VALUES
    ('Pesquisa de Satisfação', 'pesquisa-satisfacao',
     'Pesquisa de satisfação do distribuidor — preenchida pelo vendedor',
     'Smile', '#0f766e', true, false, false, false, 50)
  RETURNING id INTO v_template;

  INSERT INTO public.form_sections (template_id, title, description, display_order, is_active)
  VALUES (v_template, 'Identificação', 'Informe o cliente e a equipe responsável', 1, true)
  RETURNING id INTO v_s1;

  INSERT INTO public.form_sections (template_id, title, description, display_order, is_active)
  VALUES (v_template, 'Avaliação', 'Dê uma nota de 1 (ruim) a 5 (excelente) para cada item', 2, true)
  RETURNING id INTO v_s2;

  INSERT INTO public.form_questions
    (section_id, question_type, label, description, placeholder, is_required, display_order, identification_role)
  VALUES
    (v_s1, 'client_select', 'Código do Cliente',
     'Digite o código, o nome da loja ou o CNPJ', 'Ex: 31972345000211', true, 1, 'client')
  RETURNING id INTO v_q_client;

  INSERT INTO public.form_questions
    (section_id, question_type, label, description, is_required, display_order, identification_role, conditional_logic)
  VALUES
    (v_s1, 'client_info', 'Dados do Cliente',
     'Preenchido automaticamente a partir do código informado', false, 2, 'client_data',
     jsonb_build_object('source_question_id', v_q_client::text));

  INSERT INTO public.form_questions
    (section_id, question_type, label, description, placeholder, is_required, display_order, identification_role, conditional_logic)
  VALUES
    (v_s1, 'team_select', 'Supervisor',
     'Selecione o supervisor responsável pela loja', 'Selecione o supervisor...', true, 3, 'supervisor',
     '{"role_filter":"supervisor"}'::jsonb);

  INSERT INTO public.form_questions
    (section_id, question_type, label, description, placeholder, is_required, display_order, identification_role)
  VALUES
    (v_s1, 'vendor_select', 'RCA / Vendedor',
     'Vendedores da equipe do supervisor selecionado', 'Selecione o RCA...', true, 4, 'rca');

  FOREACH v_m IN ARRAY v_metrics LOOP
    v_i := v_i + 1;
    INSERT INTO public.form_questions
      (section_id, question_type, label, description, options, slider_config, is_required,
       display_order, is_chart_metric, metric_category, metric_name)
    VALUES (
      v_s2, 'radio', v_m, '1 = Ruim  ·  3 = Regular  ·  5 = Excelente',
      '[{"value":"1","label":"1"},{"value":"2","label":"2"},{"value":"3","label":"3"},{"value":"4","label":"4"},{"value":"5","label":"5"}]'::jsonb,
      '{"layout":"scale"}'::jsonb,
      true, v_i, true, 'satisfacao', v_m
    );
  END LOOP;
END $$;