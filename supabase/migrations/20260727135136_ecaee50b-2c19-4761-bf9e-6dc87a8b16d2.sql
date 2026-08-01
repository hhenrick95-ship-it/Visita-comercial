CREATE TABLE public.clientes_import_staging (
  codcli text, cliente text, tipofj text, cgcent text, ramo text, fantasia text,
  endereco text, bairro text,
  rca1 text, nome_rca1 text, rca2 text, nome_rca2 text, rca3 text, nome_rca3 text,
  rca4 text, nome_rca4 text, rca5 text, nome_rca5 text, rca6 text, nome_rca6 text,
  rca7 text, nome_rca7 text, situacao text, telent text, email text
);
GRANT ALL ON public.clientes_import_staging TO service_role;
ALTER TABLE public.clientes_import_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staging" ON public.clientes_import_staging FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));