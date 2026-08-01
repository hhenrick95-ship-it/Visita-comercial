ALTER TABLE public.clientes_cadastro ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.clientes_cadastro_historico ADD COLUMN IF NOT EXISTS fotos_anterior text[] DEFAULT '{}';
ALTER TABLE public.clientes_cadastro_historico ADD COLUMN IF NOT EXISTS fotos_novo text[] DEFAULT '{}';