ALTER TABLE public.visit_forms 
ADD COLUMN IF NOT EXISTS geolocation_status text,
ADD COLUMN IF NOT EXISTS geolocation_error text;

CREATE INDEX IF NOT EXISTS idx_visit_forms_no_location 
ON public.visit_forms (visit_date) 
WHERE latitude IS NULL OR longitude IS NULL;