-- Adicionar novos tipos de pergunta ao constraint
ALTER TABLE form_questions 
DROP CONSTRAINT IF EXISTS form_questions_question_type_check;

ALTER TABLE form_questions 
ADD CONSTRAINT form_questions_question_type_check 
CHECK (question_type IN (
  'text', 
  'textarea', 
  'radio', 
  'select', 
  'slider', 
  'checkbox', 
  'date', 
  'image_upload',
  'team_select',
  'vendor_select'
));