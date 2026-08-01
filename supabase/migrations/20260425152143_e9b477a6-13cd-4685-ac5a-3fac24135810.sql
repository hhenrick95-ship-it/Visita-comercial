-- =================== PEX - JBP ===================
DO $do$
DECLARE
  v_template_id uuid;
  v_section_id uuid;
  v_q_1_1_data_da_visita uuid;
  v_q_1_2_rede_cliente uuid;
  v_q_1_3_loja uuid;
  v_q_1_4_canal uuid;
  v_q_1_5_responsavel uuid;
  v_q_2_1 uuid;
  v_q_2_2 uuid;
  v_q_2_3 uuid;
  v_q_2_4 uuid;
  v_q_2_5 uuid;
  v_q_2_6 uuid;
  v_q_2_7 uuid;
  v_q_3_1 uuid;
  v_q_3_2 uuid;
  v_q_3_3 uuid;
  v_q_3_4 uuid;
  v_q_3_5 uuid;
  v_q_3_6 uuid;
  v_q_3_7 uuid;
  v_q_4_1 uuid;
  v_q_4_2 uuid;
  v_q_5_1_plano_de_acao_gerado uuid;
  v_q_5_2_qual_plano_de_acao uuid;
  v_q_5_3_responsavel uuid;
  v_q_5_4_prazo uuid;
  v_q_6_1_comentarios_adicionais uuid;
BEGIN
  INSERT INTO public.form_templates
    (slug, name, description, icon, color, is_active, is_system,
     requires_geolocation, generates_pdf, display_order)
  VALUES ('pex-jbp', 'PEX - JBP', 'Auditoria de JBP — contrapartidas, execução por categoria e desvios.',
          'ClipboardCheck', 'primary', true, false, true, true,
          (SELECT COALESCE(MAX(display_order),0)+1 FROM public.form_templates))
  RETURNING id INTO v_template_id;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Identificação', 1, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'date', 'Data da visita', true, true, NULL, 1) RETURNING id INTO v_q_1_1_data_da_visita;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'text', 'Rede/Cliente', true, true, NULL, 2) RETURNING id INTO v_q_1_2_rede_cliente;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'text', 'Loja', true, true, NULL, 3) RETURNING id INTO v_q_1_3_loja;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Canal', true, true,
          '[{"value": "tradicional", "label": "Tradicional"}, {"value": "organizado", "label": "Organizado"}]'::jsonb, 4) RETURNING id INTO v_q_1_4_canal;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'text', 'Responsável', true, true, NULL, 5) RETURNING id INTO v_q_1_5_responsavel;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Contrapartidas', 2, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Facing acordado está sendo cumprido?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 1) RETURNING id INTO v_q_2_1;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Sortimento completo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 2) RETURNING id INTO v_q_2_2;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Tiras cross executadas?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 3) RETURNING id INTO v_q_2_3;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Displays montados?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 4) RETURNING id INTO v_q_2_4;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Ilhas/Pontas executadas?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 5) RETURNING id INTO v_q_2_5;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Checkout conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 6) RETURNING id INTO v_q_2_6;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Papa fila executado?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 7) RETURNING id INTO v_q_2_7;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Execução por Categoria', 3, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'ELMA execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 1) RETURNING id INTO v_q_3_1;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'LUCKY execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 2) RETURNING id INTO v_q_3_2;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'TODDY execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 3) RETURNING id INTO v_q_3_3;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'RTD execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 4) RETURNING id INTO v_q_3_4;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'AVEIA execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 5) RETURNING id INTO v_q_3_5;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'KC execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 6) RETURNING id INTO v_q_3_6;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'MILHO execução conforme acordo?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, 7) RETURNING id INTO v_q_3_7;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Desvios', 4, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'textarea', 'O que não está sendo cumprido do JBP?', true, true, NULL, 1) RETURNING id INTO v_q_4_1;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Motivo do desvio', true, true,
          '[{"value": "loja", "label": "Loja"}, {"value": "vendedor", "label": "Vendedor"}, {"value": "cliente", "label": "Cliente"}, {"value": "logistica", "label": "Logística"}, {"value": "outro", "label": "Outro"}]'::jsonb, 2) RETURNING id INTO v_q_4_2;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Plano de Ação', 5, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'radio', 'Plano de ação gerado?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, 1) RETURNING id INTO v_q_5_1_plano_de_acao_gerado;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'textarea', 'Qual plano de ação', false, true, NULL, 2) RETURNING id INTO v_q_5_2_qual_plano_de_acao;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'text', 'Responsável', false, true, NULL, 3) RETURNING id INTO v_q_5_3_responsavel;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'text', 'Prazo', false, true, NULL, 4) RETURNING id INTO v_q_5_4_prazo;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Final', 6, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, display_order)
  VALUES (v_section_id, 'textarea', 'Comentários adicionais', false, true, NULL, 1) RETURNING id INTO v_q_6_1_comentarios_adicionais;

  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_2_qual_plano_de_acao;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_3_responsavel;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_4_prazo;
END $do$;