-- Atualiza a check constraint para incluir o novo tipo "multi_select"
ALTER TABLE public.form_questions DROP CONSTRAINT IF EXISTS form_questions_question_type_check;

ALTER TABLE public.form_questions
  ADD CONSTRAINT form_questions_question_type_check
  CHECK (question_type IN (
    'text','textarea','radio','select','slider','checkbox',
    'date','image_upload','team_select','vendor_select','multi_select'
  ));

-- Converte as 8 perguntas existentes de radio -> multi_select
UPDATE public.form_questions SET question_type = 'multi_select'
WHERE id IN (
  '5fc1bd3e-9462-42d9-8097-cf8d32699fa8',
  '991ae925-f253-41f2-9549-fe2bef896c2a',
  '39c93ced-1688-48a0-b0b3-3656942d6b77',
  '1da91eca-0fcf-47ce-86db-085583c3c7a6',
  '58f2da92-01a8-47c8-9963-46ae485f0286',
  '9ec9b67a-85bd-419d-ab2d-498218b760f2',
  '93b33d93-d9c2-46eb-b110-f9c76d797c92',
  '548633d1-bdd2-4645-abe0-62703d367de1'
);