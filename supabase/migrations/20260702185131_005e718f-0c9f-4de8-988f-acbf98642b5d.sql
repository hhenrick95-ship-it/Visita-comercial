
CREATE TABLE public.clientes_cadastro (
  codcli            bigint PRIMARY KEY,
  razao_social      text NOT NULL,
  nome_fantasia     text,
  cnpj              text,
  tipo_fj           text,
  endereco          text,
  bairro            text,
  cidade            text,
  uf                text,
  cod_rca           text,
  nome_rca          text,
  situacao          text,
  ramo_atividade    text,
  telefone          text,
  email             text,
  status_atualizacao text NOT NULL DEFAULT 'pendente'
    CHECK (status_atualizacao IN ('pendente','atualizado')),
  atualizado_em     timestamptz,
  atualizado_por    uuid,
  atualizado_por_nome text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_cadastro TO authenticated;
GRANT ALL ON public.clientes_cadastro TO service_role;

ALTER TABLE public.clientes_cadastro ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: usuário pode acessar RCA se for admin OU se o RCA está em uma equipe
-- na qual ele participa (via teams_vendors.supervisor_id).
CREATE OR REPLACE FUNCTION public.user_can_access_rca(_user_id uuid, _cod_rca text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.teams_vendors tv_user
      JOIN public.teams_vendors tv_rca
        ON tv_rca.cod_equipe = tv_user.cod_equipe
       AND tv_rca.cod_rca_lopes = _cod_rca
      WHERE tv_user.supervisor_id = _user_id
    )
$$;

REVOKE EXECUTE ON FUNCTION public.user_can_access_rca(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_rca(uuid, text) TO authenticated;

CREATE POLICY "cc_select_admin_or_own_rca" ON public.clientes_cadastro
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.user_can_access_rca(auth.uid(), cod_rca)
);

CREATE POLICY "cc_update_admin_or_own_rca" ON public.clientes_cadastro
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.user_can_access_rca(auth.uid(), cod_rca)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.user_can_access_rca(auth.uid(), cod_rca)
);

CREATE POLICY "cc_insert_admin" ON public.clientes_cadastro
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cc_delete_admin" ON public.clientes_cadastro
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_cc_cod_rca ON public.clientes_cadastro (cod_rca);
CREATE INDEX idx_cc_status  ON public.clientes_cadastro (status_atualizacao);
CREATE INDEX idx_cc_cnpj    ON public.clientes_cadastro (cnpj);
CREATE INDEX idx_cc_razao   ON public.clientes_cadastro USING gin (to_tsvector('portuguese', coalesce(razao_social,'') || ' ' || coalesce(nome_fantasia,'')));

CREATE TRIGGER trg_cc_updated_at
BEFORE UPDATE ON public.clientes_cadastro
FOR EACH ROW EXECUTE FUNCTION public.update_team_daily_goals_updated_at();

-- Histórico
CREATE TABLE public.clientes_cadastro_historico (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_codcli      bigint NOT NULL REFERENCES public.clientes_cadastro(codcli) ON DELETE CASCADE,
  cod_rca             text,
  nome_rca            text,
  razao_social        text,
  ramo_anterior       text,
  ramo_novo           text,
  telefone_anterior   text,
  telefone_novo       text,
  email_anterior      text,
  email_novo          text,
  alterado_em         timestamptz NOT NULL DEFAULT now(),
  alterado_por        uuid,
  alterado_por_nome   text,
  alterado_por_email  text
);

GRANT SELECT, INSERT ON public.clientes_cadastro_historico TO authenticated;
GRANT ALL ON public.clientes_cadastro_historico TO service_role;

ALTER TABLE public.clientes_cadastro_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cch_select_admin_or_own_rca" ON public.clientes_cadastro_historico
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.user_can_access_rca(auth.uid(), cod_rca)
);

CREATE POLICY "cch_insert_own" ON public.clientes_cadastro_historico
FOR INSERT TO authenticated
WITH CHECK (
  alterado_por = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.user_can_access_rca(auth.uid(), cod_rca)
  )
);

CREATE INDEX idx_cch_codcli ON public.clientes_cadastro_historico (cliente_codcli);
CREATE INDEX idx_cch_rca    ON public.clientes_cadastro_historico (cod_rca);
CREATE INDEX idx_cch_data   ON public.clientes_cadastro_historico (alterado_em DESC);
