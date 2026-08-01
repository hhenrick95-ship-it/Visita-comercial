ALTER TABLE public.form_sections ADD COLUMN IF NOT EXISTS conditional_logic jsonb;

UPDATE public.form_templates
SET name = 'Acompanhamento de Fornecedores',
    description = 'Acompanhamento de sortimento e espaço por fornecedor (Danone, Natural One, Cia Mineira, Piracanjuba)'
WHERE slug = 'acompanhamento-danone';

-- Pergunta de seleção do fornecedor
INSERT INTO public.form_questions (section_id, question_type, label, description, options, is_required, display_order, is_active)
VALUES (
  'b099384e-7d53-48d2-a527-1658570aca29',
  'radio',
  'Fornecedor',
  'Selecione o fornecedor que será avaliado nesta visita',
  '[{"label":"Danone","value":"danone"},{"label":"Natural One","value":"natural_one"},{"label":"Cia Mineira (Tourinho)","value":"cia_mineira"},{"label":"Piracanjuba","value":"piracanjuba"}]'::jsonb,
  true,
  0,
  true
);

-- Seção Danone passa a ser condicional
UPDATE public.form_sections
SET title = 'Sortimento Danone',
    conditional_logic = jsonb_build_object(
      'show_when', jsonb_build_object(
        'question_id', (SELECT id::text FROM public.form_questions WHERE section_id = 'b099384e-7d53-48d2-a527-1658570aca29' AND label = 'Fornecedor' LIMIT 1),
        'value', 'danone'
      )
    )
WHERE id = '4074ae85-74b9-4a91-8048-64f3c90996f0';

-- Novas seções por fornecedor
DO $$
DECLARE
  v_fornecedor_id text;
  v_template uuid := '41177b2c-7ec0-49d9-9cc0-9b3816db5b3a';
  v_section uuid;
  r record;
  v_espaco jsonb := '[{"label":"1 módulo","value":"1_modulo"},{"label":"2 módulos","value":"2_modulos"},{"label":"3 ou mais módulos","value":"3_ou_mais_modulos"},{"label":"1 prateleira","value":"1_prateleira"},{"label":"2 prateleiras","value":"2_prateleiras"},{"label":"3 ou mais prateleiras","value":"3_ou_mais_prateleiras"}]'::jsonb;
BEGIN
  SELECT id::text INTO v_fornecedor_id FROM public.form_questions
  WHERE section_id = 'b099384e-7d53-48d2-a527-1658570aca29' AND label = 'Fornecedor' LIMIT 1;

  FOR r IN SELECT * FROM (VALUES
      ('Sortimento Natural One', 'natural_one', 3),
      ('Sortimento Cia Mineira (Tourinho)', 'cia_mineira', 4),
      ('Sortimento Piracanjuba', 'piracanjuba', 5)
    ) AS t(title, val, ord)
  LOOP
    INSERT INTO public.form_sections (template_id, title, description, display_order, is_active, conditional_logic)
    VALUES (
      v_template, r.title, 'Marque a situação de cada produto na loja', r.ord, true,
      jsonb_build_object('show_when', jsonb_build_object('question_id', v_fornecedor_id, 'value', r.val))
    )
    RETURNING id INTO v_section;

    INSERT INTO public.form_questions (section_id, question_type, label, options, is_required, display_order, is_active)
    VALUES
      (v_section, 'radio', 'Qual o meu espaço na loja?', v_espaco, false, 90, true),
      (v_section, 'radio', 'Qual o espaço da Nestlé na loja?', v_espaco, false, 91, true);
  END LOOP;
END $$;

-- Fotos e Observações vai para o fim
UPDATE public.form_sections SET display_order = 9 WHERE id = 'f2e2534f-3235-41bf-9350-ae576489fd15';