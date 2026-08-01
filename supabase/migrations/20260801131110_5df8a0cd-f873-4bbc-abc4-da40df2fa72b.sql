ALTER TABLE public.form_questions ADD COLUMN IF NOT EXISTS image_url text;

DO $$
DECLARE
  v_template uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid;
  v_items jsonb := '[
    {"label":"Danone Liq Morango 850g","img":"/__l5e/assets-v1/5045d77d-ee32-40f2-b7be-2bf72670ed54/danone-liq-mor-850g.png"},
    {"label":"Danone Natural Integral 160g","img":"/__l5e/assets-v1/e4a3cc83-a72c-4d33-b197-7ab73b463f50/danone-natural-int-160g.png"},
    {"label":"YoPRO Choco 15g","img":"/__l5e/assets-v1/0444301c-2af4-4864-820a-db8ec3e04834/yopro-choco-15g.png"},
    {"label":"YoPRO Morango 15g","img":"/__l5e/assets-v1/686c6ece-6bb6-4847-af48-81ac595e4f4d/yopro-morango-15g.png"},
    {"label":"Danoninho 320g Petit","img":"/__l5e/assets-v1/b887633c-bf06-4457-ab77-f3c243fbd465/danoninho-320g-petit.png"},
    {"label":"Activia 800g Morango","img":"/__l5e/assets-v1/d7336ae1-985c-4a85-8834-9329df60a9e9/activia-800g-morango.png"},
    {"label":"Danone Morango 170g","img":"/__l5e/assets-v1/5f3b7674-9a4f-4eec-9b5f-97c44e3b9b0a/danone-morango-170g.png"},
    {"label":"Danoninho Pouch 70g","img":"/__l5e/assets-v1/adc4e72c-92cf-4e57-b85c-47e2f6316d4e/danoninho-pouch-70g.png"},
    {"label":"Activia 170g Morango","img":"/__l5e/assets-v1/70221028-21cb-49a9-ab24-fdd01e9d8d7b/activia-170g-morango.png"}
  ]'::jsonb;
  v_item jsonb;
  v_i int := 0;
BEGIN
  INSERT INTO public.form_templates (name, slug, description, icon, color, is_active, is_system, requires_geolocation, generates_pdf, display_order)
  VALUES ('Acompanhamento Danone', 'acompanhamento-danone', 'Acompanhamento de sortimento e ruptura dos itens infaltáveis Danone', 'ClipboardList', '#1a4fa0', true, false, true, true, 40)
  RETURNING id INTO v_template;

  INSERT INTO public.form_sections (template_id, title, description, display_order, is_active)
  VALUES (v_template, 'Identificação', 'Dados do responsável e da loja', 1, true) RETURNING id INTO v_s1;
  INSERT INTO public.form_sections (template_id, title, description, display_order, is_active)
  VALUES (v_template, 'Sortimento Danone - 9 Itens Infaltáveis', 'Para cada item, informe a situação na loja', 2, true) RETURNING id INTO v_s2;
  INSERT INTO public.form_sections (template_id, title, description, display_order, is_active)
  VALUES (v_template, 'Fotos e Observações', 'Anexe fotos da gôndola/exposição', 3, true) RETURNING id INTO v_s3;

  INSERT INTO public.form_questions (section_id, question_type, label, description, placeholder, is_required, display_order, identification_role, conditional_logic)
  VALUES
    (v_s1, 'team_select', 'Gestor Responsável', null, 'Selecione o gestor...', true, 1, 'manager', '{"role_filter":"coordenador,gerente,supervisor"}'::jsonb),
    (v_s1, 'vendor_select', 'RCA / Vendedor', null, 'Selecione o RCA...', true, 2, 'vendor', null),
    (v_s1, 'text', 'Rede/Cliente', 'Nome da rede ou do cliente visitado', 'Ex: Supermercado Central', true, 3, 'client', null),
    (v_s1, 'text', 'Quantos checkouts a loja tem?', 'Informe a quantidade de checkouts', 'Ex: 8', true, 4, null, null);

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_i := v_i + 1;
    INSERT INTO public.form_questions (section_id, question_type, label, image_url, options, is_required, display_order, is_chart_metric, metric_category, metric_name)
    VALUES (
      v_s2, 'radio', v_item->>'label', v_item->>'img',
      '[{"value":"fica_com_ruptura","label":"Fica com ruptura"},{"value":"nao_vende","label":"Não vende"}]'::jsonb,
      true, v_i, true, 'sortimento_danone', v_item->>'label'
    );
  END LOOP;

  INSERT INTO public.form_questions (section_id, question_type, label, description, is_required, display_order, slider_config)
  VALUES (v_s3, 'image_upload', 'Fotos da loja / gôndola', 'Anexe até 6 fotos', false, 1, '{"maxImages":6}'::jsonb);
  INSERT INTO public.form_questions (section_id, question_type, label, placeholder, is_required, display_order)
  VALUES (v_s3, 'textarea', 'Observações gerais', 'Descreva pontos relevantes da visita', false, 2);
END $$;