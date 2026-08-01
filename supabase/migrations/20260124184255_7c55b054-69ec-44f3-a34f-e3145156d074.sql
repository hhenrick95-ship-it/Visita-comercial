-- Criar tabela de histórico de importações
CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_created integer NOT NULL DEFAULT 0,
  total_updated integer NOT NULL DEFAULT 0,
  created_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  rolled_back_at timestamp with time zone,
  rolled_back_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar histórico
CREATE POLICY "Admins manage import history"
ON public.import_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Bloquear acesso anônimo
CREATE POLICY "Block anonymous access to import_history"
ON public.import_history
FOR ALL
USING (false);

-- Índice para busca por status
CREATE INDEX idx_import_history_status ON public.import_history(status);
CREATE INDEX idx_import_history_created_at ON public.import_history(created_at DESC);