UPDATE public.form_questions
SET image_url = regexp_replace(regexp_replace(image_url, '^.*/', ''), '\.(png|jpe?g|webp)$', '')
WHERE image_url LIKE '/__l5e/%';