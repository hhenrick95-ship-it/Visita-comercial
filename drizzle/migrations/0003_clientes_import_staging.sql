CREATE TABLE IF NOT EXISTS public.clientes_import_staging (
  codcli bigint, razao_social text, tipo_fj text, cnpj text, ramo text, fantasia text,
  endereco text, bairro text, cidade text, uf text, situacao text, telefone text, email text
);
CREATE TABLE IF NOT EXISTS public.clientes_rcas_import_staging (codcli bigint, cod_rca text, nome_rca text);
GRANT ALL ON public.clientes_import_staging TO service_role;
GRANT ALL ON public.clientes_rcas_import_staging TO service_role;
ALTER TABLE public.clientes_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_rcas_import_staging ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.clientes_import_staging IS 'Temporary staging for XLSX client imports; not used by the app.';
COMMENT ON TABLE public.clientes_rcas_import_staging IS 'Temporary staging for XLSX client-RCA imports; not used by the app.';