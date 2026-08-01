-- =====================================================
-- ITEM 1: Adicionar "Nome do Gerente" no PEX - JBP
-- =====================================================
DO $$
DECLARE
  v_section_id uuid;
BEGIN
  SELECT s.id INTO v_section_id
  FROM form_sections s
  JOIN form_templates t ON t.id = s.template_id
  WHERE t.slug = 'pex-jbp' AND s.title = 'Identificação'
  LIMIT 1;

  IF v_section_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM form_questions
       WHERE section_id = v_section_id AND question_type = 'team_select'
     )
  THEN
    -- Empurra perguntas existentes em +1 para abrir a posição 1
    UPDATE form_questions
    SET display_order = display_order + 1
    WHERE section_id = v_section_id;

    -- Insere o novo campo team_select
    INSERT INTO form_questions (
      section_id, question_type, label, description,
      is_required, is_active, display_order, identification_role
    ) VALUES (
      v_section_id, 'team_select', 'Nome do Gerente',
      'Selecione o gestor responsável pela visita',
      true, true, 1, 'manager'
    );
  END IF;
END $$;

-- =====================================================
-- ITEM 2: Foreign Keys + ON DELETE CASCADE
-- =====================================================

-- Limpeza defensiva de registros órfãos antes de criar FKs
DELETE FROM form_sections
WHERE template_id IS NOT NULL
  AND template_id NOT IN (SELECT id FROM form_templates);

DELETE FROM form_questions
WHERE section_id IS NOT NULL
  AND section_id NOT IN (SELECT id FROM form_sections);

DELETE FROM form_responses
WHERE submission_id IS NOT NULL
  AND submission_id NOT IN (SELECT id FROM form_submissions);

DELETE FROM form_responses
WHERE question_id IS NOT NULL
  AND question_id NOT IN (SELECT id FROM form_questions);

DELETE FROM form_responses
WHERE visit_form_id IS NOT NULL
  AND visit_form_id NOT IN (SELECT id FROM visit_forms);

-- form_sections.template_id -> form_templates(id)  CASCADE
ALTER TABLE form_sections
  DROP CONSTRAINT IF EXISTS form_sections_template_id_fkey;
ALTER TABLE form_sections
  ADD CONSTRAINT form_sections_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE;

-- form_questions.section_id -> form_sections(id)  CASCADE
ALTER TABLE form_questions
  DROP CONSTRAINT IF EXISTS form_questions_section_id_fkey;
ALTER TABLE form_questions
  ADD CONSTRAINT form_questions_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE;

-- form_submissions.template_id -> form_templates(id)  RESTRICT
ALTER TABLE form_submissions
  DROP CONSTRAINT IF EXISTS form_submissions_template_id_fkey;
ALTER TABLE form_submissions
  ADD CONSTRAINT form_submissions_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE RESTRICT;

-- form_responses.submission_id -> form_submissions(id)  CASCADE
ALTER TABLE form_responses
  DROP CONSTRAINT IF EXISTS form_responses_submission_id_fkey;
ALTER TABLE form_responses
  ADD CONSTRAINT form_responses_submission_id_fkey
  FOREIGN KEY (submission_id) REFERENCES form_submissions(id) ON DELETE CASCADE;

-- form_responses.question_id -> form_questions(id)  CASCADE
ALTER TABLE form_responses
  DROP CONSTRAINT IF EXISTS form_responses_question_id_fkey;
ALTER TABLE form_responses
  ADD CONSTRAINT form_responses_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE;

-- form_responses.visit_form_id -> visit_forms(id)  CASCADE
ALTER TABLE form_responses
  DROP CONSTRAINT IF EXISTS form_responses_visit_form_id_fkey;
ALTER TABLE form_responses
  ADD CONSTRAINT form_responses_visit_form_id_fkey
  FOREIGN KEY (visit_form_id) REFERENCES visit_forms(id) ON DELETE CASCADE;

-- Índices para suportar as FKs
CREATE INDEX IF NOT EXISTS idx_form_sections_template_id ON form_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_form_questions_section_id ON form_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON form_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_submission_id ON form_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_question_id ON form_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_visit_form_id ON form_responses(visit_form_id);