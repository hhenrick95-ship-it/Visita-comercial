ALTER TABLE public.clientes_cadastro ADD COLUMN IF NOT EXISTS qtd_checkouts integer;
ALTER TABLE public.clientes_cadastro_historico ADD COLUMN IF NOT EXISTS checkouts_anterior integer;
ALTER TABLE public.clientes_cadastro_historico ADD COLUMN IF NOT EXISTS checkouts_novo integer;