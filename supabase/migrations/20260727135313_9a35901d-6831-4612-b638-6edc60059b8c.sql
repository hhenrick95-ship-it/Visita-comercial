GRANT SELECT ON public.clientes_cadastro_rcas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clientes_cadastro_rcas TO authenticated;
GRANT ALL ON public.clientes_cadastro_rcas TO service_role;