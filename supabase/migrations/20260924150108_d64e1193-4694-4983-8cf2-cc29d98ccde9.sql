ALTER TABLE public.teams_vendors DROP CONSTRAINT IF EXISTS teams_vendors_cod_rca_lopes_unique;
DROP INDEX IF EXISTS public.teams_vendors_cod_rca_lopes_unique;
CREATE UNIQUE INDEX teams_vendors_rca_equipe_unique ON public.teams_vendors (cod_rca_lopes, cod_equipe);
INSERT INTO public.teams_vendors (cod_rca_lopes, nome_rca, cod_equipe, nome_equipe, cargo)
SELECT cod_rca_lopes, nome_rca, '4590', 'EQUIPE P - SIDNEY NUNES', cargo
FROM public.teams_vendors
WHERE cod_equipe='4500' AND cod_rca_lopes IN ('4510','4511','4512','4513','4515','4516','4518','4519');