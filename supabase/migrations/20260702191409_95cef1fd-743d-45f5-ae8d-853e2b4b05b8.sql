ALTER TABLE public.clientes_cadastro_historico
  ADD COLUMN IF NOT EXISTS fantasia_anterior text,
  ADD COLUMN IF NOT EXISTS fantasia_novo text;