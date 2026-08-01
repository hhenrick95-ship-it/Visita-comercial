-- =================== PEX - Visita Supervisor ===================
DO $do$
DECLARE
  v_template_id uuid;
  v_section_id uuid;
  v_q_1_1_data uuid;
  v_q_1_2_cod_cliente_visitado uuid;
  v_q_1_3_canal uuid;
  v_q_1_4_nome_do_supervisor_da_rota uuid;
  v_q_1_5_cod_rca_lopes uuid;
  v_q_2_1_sequencia_do_roteiro_foi_respeitada uuid;
  v_q_2_2_quantidade_de_visitas_ideal uuid;
  v_q_3_1_rack_invadido uuid;
  v_q_3_2_sortimento_prioritario_salty uuid;
  v_q_3_3_sortimento_prioritario_foods uuid;
  v_q_3_4_precos_visiveis_e_corretos uuid;
  v_q_3_5_quais_habilidades_foram_trabalhadas uuid;
  v_q_3_6_preco_visivel_e_correto uuid;
  v_q_3_7_pdv_execucao_loja_perfeita_acima_de_80 uuid;
  v_q_4_1_vendedor_seguiu_abordagem_correta uuid;
  v_q_4_2_vendedor_demonstrou_conhecimento_do_mix uuid;
  v_q_4_3_vendedor_sabe_a_rotina_basica uuid;
  v_q_4_4_nivel_de_relacionamento_pdv_1_5 uuid;
  v_q_5_1_plano_de_acao_gerado uuid;
  v_q_5_2_qual_plano_de_acao uuid;
  v_q_5_3_responsavel uuid;
  v_q_5_4_prazo uuid;
  v_q_5_5_data_do_plano uuid;
  v_q_5_6_comentarios_adicionais uuid;
  v_q_6_1_fotos uuid;
BEGIN
  INSERT INTO public.form_templates
    (slug, name, description, icon, color, is_active, is_system,
     requires_geolocation, generates_pdf, display_order)
  VALUES ('pex-supervisor', 'PEX - Visita Supervisor', 'Acompanhamento PEX para supervisores — execução de rota, PDV e desenvolvimento.',
          'ClipboardCheck', 'primary', true, false, true, true,
          (SELECT COALESCE(MAX(display_order),0)+1 FROM public.form_templates))
  RETURNING id INTO v_template_id;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Identificação', 1, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'date', 'Data', true, true, NULL, NULL, 1) RETURNING id INTO v_q_1_1_data;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'text', 'Cod Cliente Visitado', true, true, NULL, NULL, 2) RETURNING id INTO v_q_1_2_cod_cliente_visitado;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Canal', true, true,
          '[{"value": "tradicional", "label": "Tradicional"}, {"value": "organizado", "label": "Organizado"}]'::jsonb, NULL, 3) RETURNING id INTO v_q_1_3_canal;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'team_select', 'Nome do Supervisor da Rota', true, true, NULL, NULL, 4) RETURNING id INTO v_q_1_4_nome_do_supervisor_da_rota;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'vendor_select', 'Cod RCA Lopes', true, true, NULL, NULL, 5) RETURNING id INTO v_q_1_5_cod_rca_lopes;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Execução de Rota', 2, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Sequência do roteiro foi respeitada?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_2_1_sequencia_do_roteiro_foi_respeitada;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Quantidade de visitas ideal?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_2_2_quantidade_de_visitas_ideal;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Execução PDV', 3, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Rack Invadido?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_3_1_rack_invadido;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Sortimento Prioritário Salty', true, true,
          '[{"value": "ruffles", "label": "Ruffles"}, {"value": "doritos", "label": "Doritos"}, {"value": "cheetos", "label": "Cheetos"}, {"value": "nenhum", "label": "Nenhum"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_3_2_sortimento_prioritario_salty;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Sortimento Prioritário Foods', true, true,
          '[{"value": "toddynho_levinho", "label": "Toddynho Levinho"}, {"value": "toddynho_tradicional", "label": "Toddynho Tradicional"}, {"value": "toddy", "label": "Toddy"}, {"value": "aveia", "label": "Aveia"}, {"value": "kero_coco_1l", "label": "Kero coco 1L"}, {"value": "kero_coco_200ml", "label": "Kero coco 200ml"}, {"value": "kero_coco_330ml", "label": "Kero coco 330ml"}, {"value": "nenhum", "label": "Nenhum"}]'::jsonb, NULL, 3) RETURNING id INTO v_q_3_3_sortimento_prioritario_foods;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Preços Visíveis e Corretos', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}, {"value": "parcialmente", "label": "Parcialmente"}]'::jsonb, NULL, 4) RETURNING id INTO v_q_3_4_precos_visiveis_e_corretos;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Quais habilidades foram trabalhadas?', true, true,
          '[{"value": "abordagem", "label": "Abordagem"}, {"value": "negociacao", "label": "Negociação"}, {"value": "execucao", "label": "Execução"}, {"value": "planejamento", "label": "Planejamento"}, {"value": "mix", "label": "Mix"}, {"value": "uso_de_ferramenta", "label": "Uso de ferramenta"}, {"value": "outro", "label": "Outro"}]'::jsonb, NULL, 5) RETURNING id INTO v_q_3_5_quais_habilidades_foram_trabalhadas;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Preço visível e correto?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}, {"value": "parcial", "label": "Parcial"}]'::jsonb, NULL, 6) RETURNING id INTO v_q_3_6_preco_visivel_e_correto;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'PDV execução Loja Perfeita acima de 80%?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 7) RETURNING id INTO v_q_3_7_pdv_execucao_loja_perfeita_acima_de_80;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Desenvolvimento', 4, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Vendedor seguiu abordagem correta?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}, {"value": "parcial", "label": "Parcial"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_4_1_vendedor_seguiu_abordagem_correta;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Vendedor demonstrou conhecimento do mix?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}, {"value": "parcial", "label": "Parcial"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_4_2_vendedor_demonstrou_conhecimento_do_mix;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Vendedor sabe a rotina básica?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}, {"value": "parcial", "label": "Parcial"}]'::jsonb, NULL, 3) RETURNING id INTO v_q_4_3_vendedor_sabe_a_rotina_basica;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'slider', 'Nível de relacionamento PDV (1-5)', true, true,
          NULL, '{"min": 1, "max": 5, "step": 1}'::jsonb, 4) RETURNING id INTO v_q_4_4_nivel_de_relacionamento_pdv_1_5;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Plano de Ação', 5, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Plano de ação gerado?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_5_1_plano_de_acao_gerado;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'Qual plano de ação', false, true, NULL, NULL, 2) RETURNING id INTO v_q_5_2_qual_plano_de_acao;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'text', 'Responsável', false, true, NULL, NULL, 3) RETURNING id INTO v_q_5_3_responsavel;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'text', 'Prazo', false, true, NULL, NULL, 4) RETURNING id INTO v_q_5_4_prazo;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'date', 'Data do plano', false, true, NULL, NULL, 5) RETURNING id INTO v_q_5_5_data_do_plano;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'Comentários adicionais', false, true, NULL, NULL, 6) RETURNING id INTO v_q_5_6_comentarios_adicionais;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Foto', 6, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'image_upload', 'Fotos', true, true, NULL, NULL, 1) RETURNING id INTO v_q_6_1_fotos;

  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_2_qual_plano_de_acao;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_3_responsavel;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_4_prazo;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_5_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_5_5_data_do_plano;
END $do$;