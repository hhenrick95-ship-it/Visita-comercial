-- Padroniza o vínculo entre o vendor_select (RCA) e o team_select anterior
-- (gerente/supervisor) na MESMA seção, em todos os templates ativos.
-- Esta migration é idempotente: só preenche team_question_id quando ele
-- ainda não estiver definido.
DO $$
DECLARE
  r record;
  v_parent_id uuid;
BEGIN
  FOR r IN
    SELECT q.id, q.section_id, q.display_order, q.conditional_logic
    FROM public.form_questions q
    WHERE q.question_type = 'vendor_select'
      AND q.is_active = true
      AND (q.conditional_logic IS NULL
           OR (q.conditional_logic ->> 'team_question_id') IS NULL)
  LOOP
    SELECT p.id INTO v_parent_id
    FROM public.form_questions p
    WHERE p.section_id = r.section_id
      AND p.question_type = 'team_select'
      AND p.is_active = true
      AND p.display_order < r.display_order
    ORDER BY p.display_order DESC
    LIMIT 1;

    IF v_parent_id IS NOT NULL THEN
      UPDATE public.form_questions
      SET conditional_logic =
        COALESCE(conditional_logic, '{}'::jsonb)
        || jsonb_build_object('team_question_id', v_parent_id::text)
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;