
UPDATE public.form_questions
SET conditional_logic = COALESCE(conditional_logic, '{}'::jsonb) || jsonb_build_object('role_filter', 'gerente')
WHERE label ILIKE '%gerente%' AND question_type = 'team_select';

UPDATE public.form_questions
SET conditional_logic = COALESCE(conditional_logic, '{}'::jsonb) || jsonb_build_object('role_filter', 'supervisor')
WHERE label ILIKE '%supervisor%' AND question_type = 'team_select';
