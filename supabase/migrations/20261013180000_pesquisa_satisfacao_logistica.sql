-- Pesquisa de Qualidade da Entrega (satisfação logística)
-- Respondida pelo cliente via link público, sem login.

CREATE TABLE public.pesquisa_satisfacao_logistica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cliente_nome text CHECK (char_length(cliente_nome) <= 200),
  cliente_codigo text CHECK (char_length(cliente_codigo) <= 50),
  entrega_no_prazo text NOT NULL CHECK (entrega_no_prazo IN ('sim', 'nao')),
  condicao_produtos text NOT NULL CHECK (condicao_produtos IN ('sim_todos', 'parcialmente', 'nao')),
  pedido_correto text NOT NULL CHECK (pedido_correto IN ('totalmente_correto', 'pequenas_divergencias', 'divergencias_relevantes')),
  nota_atendimento smallint NOT NULL CHECK (nota_atendimento BETWEEN 1 AND 5),
  nota_satisfacao smallint NOT NULL CHECK (nota_satisfacao BETWEEN 1 AND 5),
  sugestao_melhoria text CHECK (char_length(sugestao_melhoria) <= 2000)
);

CREATE INDEX idx_pesquisa_satisfacao_logistica_created_at
  ON public.pesquisa_satisfacao_logistica (created_at DESC);

ALTER TABLE public.pesquisa_satisfacao_logistica ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa com o link pode enviar uma resposta (somente inserir)
GRANT INSERT ON public.pesquisa_satisfacao_logistica TO anon, authenticated;
CREATE POLICY "Qualquer um pode responder a pesquisa"
  ON public.pesquisa_satisfacao_logistica
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Somente administradores leem as respostas
GRANT SELECT ON public.pesquisa_satisfacao_logistica TO authenticated;
CREATE POLICY "Admins podem ver respostas da pesquisa"
  ON public.pesquisa_satisfacao_logistica
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
