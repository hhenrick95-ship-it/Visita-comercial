-- =================== PEX - Visita Gerente ===================
DO $do$
DECLARE
  v_template_id uuid;
  v_section_id uuid;
  v_q_1_1_data_da_rota uuid;
  v_q_1_2_nome_do_gerente uuid;
  v_q_1_3_nome_do_supervisor_da_rota uuid;
  v_q_1_4_cod_rca_lopes uuid;
  v_q_1_5_canal uuid;
  v_q_1_6_cod_cliente_visitado uuid;
  v_q_2_1_rack_invadido uuid;
  v_q_2_2_pdv_execucao_loja_perfeita_acima_de_80 uuid;
  v_q_2_3_sortimento_prioritario_salty uuid;
  v_q_2_4_sortimento_prioritario_foods uuid;
  v_q_2_5_precos_visiveis_e_corretos uuid;
  v_q_3_1_quais_habilidades_foram_trabalhadas uuid;
  v_q_3_2_qual_foi_a_principal_habilidade_trabalha uuid;
  v_q_3_3_houve_orientacao_pratica uuid;
  v_q_3_4_foi_feito_exemplo_em_loja uuid;
  v_q_3_5_vendedor_executou_apos_orientacao uuid;
  v_q_4_1_cliente_positivado uuid;
  v_q_4_2_frequencia_sendo_cumprida uuid;
  v_q_5_1_vendedor_apresentou_mix_ideal uuid;
  v_q_5_2_vendedor_aplicou_acao_de_positivacao uuid;
  v_q_5_3_observacoes_no_vendedor uuid;
  v_q_6_1_nivel_de_relacionamento_pdv_1_5 uuid;
  v_q_7_1_melhorias uuid;
  v_q_7_2_o_que_precisa_ser_melhorado_no_pdv uuid;
  v_q_7_3_oportunidade_de_expansao_de_mix_visibili uuid;
  v_q_8_1_plano_de_acao_gerado uuid;
  v_q_8_2_qual_plano_de_acao uuid;
  v_q_8_3_responsavel uuid;
  v_q_8_4_prazo uuid;
  v_q_8_5_data_do_plano uuid;
  v_q_9_1_comentarios_adicionais uuid;
  v_q_10_1_foto_ruptura_concorrencia_coaching uuid;
BEGIN
  INSERT INTO public.form_templates
    (slug, name, description, icon, color, is_active, is_system,
     requires_geolocation, generates_pdf, display_order)
  VALUES ('pex-gerente', 'PEX - Visita Gerente', 'Acompanhamento PEX para gerentes — execução de PDV, coaching e plano de ação.',
          'ClipboardCheck', 'primary', true, false, true, true,
          (SELECT COALESCE(MAX(display_order),0)+1 FROM public.form_templates))
  RETURNING id INTO v_template_id;

  INSERT INTO public.form_sections (template_id, title, description, display_order, is_active)
  VALUES (v_template_id, 'Identificação', NULL, 1, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'date', 'Data da Rota', true, true, NULL, NULL, 1) RETURNING id INTO v_q_1_1_data_da_rota;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'team_select', 'Nome do Gerente', true, true, NULL, NULL, 2) RETURNING id INTO v_q_1_2_nome_do_gerente;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'team_select', 'Nome do Supervisor da Rota', true, true, NULL, NULL, 3) RETURNING id INTO v_q_1_3_nome_do_supervisor_da_rota;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'vendor_select', 'Cod RCA Lopes', true, true, NULL, NULL, 4) RETURNING id INTO v_q_1_4_cod_rca_lopes;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Canal', true, true,
          '[{"value": "tradicional", "label": "Tradicional"}, {"value": "organizado", "label": "Organizado"}]'::jsonb, NULL, 5) RETURNING id INTO v_q_1_5_canal;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'text', 'Cod Cliente Visitado', true, true, NULL, NULL, 6) RETURNING id INTO v_q_1_6_cod_cliente_visitado;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Execução PDV', 2, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Rack Invadido?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_2_1_rack_invadido;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'PDV execução Loja Perfeita acima de 80%?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_2_2_pdv_execucao_loja_perfeita_acima_de_80;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Sortimento Prioritário Salty', true, true,
          '[{"value": "ruffles", "label": "Ruffles"}, {"value": "doritos", "label": "Doritos"}, {"value": "cheetos", "label": "Cheetos"}, {"value": "nenhum", "label": "Nenhum"}]'::jsonb, NULL, 3) RETURNING id INTO v_q_2_3_sortimento_prioritario_salty;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Sortimento Prioritário Foods', true, true,
          '[{"value": "toddynho_levinho", "label": "Toddynho Levinho"}, {"value": "toddynho_tradicional", "label": "Toddynho Tradicional"}, {"value": "toddy", "label": "Toddy"}, {"value": "aveia", "label": "Aveia"}, {"value": "kero_coco_1l", "label": "Kero coco 1L"}, {"value": "kero_coco_200ml", "label": "Kero coco 200ml"}, {"value": "kero_coco_330ml", "label": "Kero coco 330ml"}, {"value": "nenhum", "label": "Nenhum"}]'::jsonb, NULL, 4) RETURNING id INTO v_q_2_4_sortimento_prioritario_foods;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Preços Visíveis e Corretos', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}, {"value": "parcialmente", "label": "Parcialmente"}]'::jsonb, NULL, 5) RETURNING id INTO v_q_2_5_precos_visiveis_e_corretos;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Coaching do Vendedor', 3, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Quais habilidades foram trabalhadas?', true, true,
          '[{"value": "abordagem", "label": "Abordagem"}, {"value": "negociacao", "label": "Negociação"}, {"value": "execucao", "label": "Execução"}, {"value": "planejamento", "label": "Planejamento"}, {"value": "mix", "label": "Mix"}, {"value": "uso_de_ferramenta", "label": "Uso de ferramenta"}, {"value": "outro", "label": "Outro"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_3_1_quais_habilidades_foram_trabalhadas;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Qual foi a principal habilidade trabalhada?', true, true,
          '[{"value": "abordagem", "label": "Abordagem"}, {"value": "negociacao", "label": "Negociação"}, {"value": "execucao", "label": "Execução"}, {"value": "planejamento", "label": "Planejamento"}, {"value": "mix", "label": "Mix"}, {"value": "uso_de_ferramenta", "label": "Uso de ferramenta"}, {"value": "outro", "label": "Outro"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_3_2_qual_foi_a_principal_habilidade_trabalha;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Houve orientação prática?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 3) RETURNING id INTO v_q_3_3_houve_orientacao_pratica;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Foi feito exemplo em loja?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 4) RETURNING id INTO v_q_3_4_foi_feito_exemplo_em_loja;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Vendedor executou após orientação?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 5) RETURNING id INTO v_q_3_5_vendedor_executou_apos_orientacao;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Positivação', 4, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Cliente positivado?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_4_1_cliente_positivado;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Frequência sendo cumprida?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_4_2_frequencia_sendo_cumprida;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Mix e Vendedor', 5, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Vendedor apresentou mix ideal?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "parcial", "label": "Parcial"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_5_1_vendedor_apresentou_mix_ideal;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Vendedor aplicou ação de positivação?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 2) RETURNING id INTO v_q_5_2_vendedor_aplicou_acao_de_positivacao;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'Observações no vendedor', true, true, NULL, NULL, 3) RETURNING id INTO v_q_5_3_observacoes_no_vendedor;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Relacionamento PDV', 6, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'slider', 'Nível de relacionamento PDV (1-5)', true, true,
          NULL, '{"min": 1, "max": 5, "step": 1}'::jsonb, 1) RETURNING id INTO v_q_6_1_nivel_de_relacionamento_pdv_1_5;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Oportunidades', 7, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Melhorias', true, true,
          '[{"value": "mix_prioritario", "label": "Mix Prioritário"}, {"value": "preco", "label": "Preço"}, {"value": "espaco_adicional", "label": "Espaço Adicional"}, {"value": "promocao", "label": "Promoção"}, {"value": "visibilidade", "label": "Visibilidade"}, {"value": "nenhum", "label": "Nenhum"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_7_1_melhorias;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'O que precisa ser melhorado no PDV', true, true, NULL, NULL, 2) RETURNING id INTO v_q_7_2_o_que_precisa_ser_melhorado_no_pdv;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'Oportunidade de expansão de mix/visibilidade', true, true, NULL, NULL, 3) RETURNING id INTO v_q_7_3_oportunidade_de_expansao_de_mix_visibili;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Plano de Ação', 8, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'radio', 'Plano de ação gerado?', true, true,
          '[{"value": "sim", "label": "Sim"}, {"value": "nao", "label": "Não"}]'::jsonb, NULL, 1) RETURNING id INTO v_q_8_1_plano_de_acao_gerado;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'Qual plano de ação', false, true, NULL, NULL, 2) RETURNING id INTO v_q_8_2_qual_plano_de_acao;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'text', 'Responsável', false, true, NULL, NULL, 3) RETURNING id INTO v_q_8_3_responsavel;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'text', 'Prazo', false, true, NULL, NULL, 4) RETURNING id INTO v_q_8_4_prazo;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'date', 'Data do plano', false, true, NULL, NULL, 5) RETURNING id INTO v_q_8_5_data_do_plano;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Comentários', 9, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'textarea', 'Comentários adicionais', false, true, NULL, NULL, 1) RETURNING id INTO v_q_9_1_comentarios_adicionais;

  INSERT INTO public.form_sections (template_id, title, display_order, is_active)
  VALUES (v_template_id, 'Fotos', 10, true) RETURNING id INTO v_section_id;
  INSERT INTO public.form_questions (section_id, question_type, label, is_required, is_active, options, slider_config, display_order)
  VALUES (v_section_id, 'image_upload', 'FOTO: Ruptura / Concorrencia / Coaching', true, true, NULL, NULL, 1) RETURNING id INTO v_q_10_1_foto_ruptura_concorrencia_coaching;

  -- Condicionais do Plano de Ação
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_8_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_8_2_qual_plano_de_acao;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_8_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_8_3_responsavel;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_8_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_8_4_prazo;
  UPDATE public.form_questions SET conditional_logic = jsonb_build_object('show_when', jsonb_build_object('question_id', v_q_8_1_plano_de_acao_gerado::text, 'operator', 'equals', 'value', 'sim')) WHERE id = v_q_8_5_data_do_plano;
END $do$;