-- 1) Tabela de relacionamento cliente <-> RCA
CREATE TABLE public.clientes_cadastro_rcas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codcli bigint NOT NULL REFERENCES public.clientes_cadastro(codcli) ON DELETE CASCADE,
    cod_rca text NOT NULL,
    nome_rca text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(codcli, cod_rca)
);

-- 2) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_cadastro_rcas TO authenticated;
GRANT ALL ON public.clientes_cadastro_rcas TO service_role;

-- 3) RLS
ALTER TABLE public.clientes_cadastro_rcas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam relacionamentos cliente-RCA"
ON public.clientes_cadastro_rcas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários veem relacionamentos de RCAs acessíveis"
ON public.clientes_cadastro_rcas
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
        SELECT 1 FROM public.teams_vendors tv
        WHERE tv.cod_rca_lopes = clientes_cadastro_rcas.cod_rca
          AND tv.supervisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'gestor')
    )
);

-- 4) Trigger de updated_at
CREATE OR REPLACE FUNCTION public.update_clientes_cadastro_rcas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clientes_cadastro_rcas_updated_at
BEFORE UPDATE ON public.clientes_cadastro_rcas
FOR EACH ROW EXECUTE FUNCTION public.update_clientes_cadastro_rcas_updated_at();

-- 5) Migra dados existentes da coluna cod_rca/nome_rca da tabela mestre
INSERT INTO public.clientes_cadastro_rcas (codcli, cod_rca, nome_rca)
SELECT codcli, cod_rca, nome_rca
FROM public.clientes_cadastro
WHERE cod_rca IS NOT NULL AND trim(cod_rca) != ''
ON CONFLICT (codcli, cod_rca) DO NOTHING;

-- 6) Atualiza política de clientes_cadastro para considerar a junction table
-- Remove política antiga baseada apenas em cod_rca e cria nova
DROP POLICY IF EXISTS "Users can view clients from their teams" ON public.clientes_cadastro;

CREATE POLICY "Users can view clients from their teams"
ON public.clientes_cadastro
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
        SELECT 1 FROM public.clientes_cadastro_rcas r
        JOIN public.teams_vendors tv ON tv.cod_rca_lopes = r.cod_rca
        WHERE r.codcli = clientes_cadastro.codcli
          AND tv.supervisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'gestor')
    )
);

-- 7) Atualiza política de histórico
DROP POLICY IF EXISTS "Users can view history from their teams" ON public.clientes_cadastro_historico;

CREATE POLICY "Users can view history from their teams"
ON public.clientes_cadastro_historico
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
        SELECT 1 FROM public.clientes_cadastro_rcas r
        JOIN public.teams_vendors tv ON tv.cod_rca_lopes = r.cod_rca
        WHERE r.codcli = clientes_cadastro_historico.cliente_codcli
          AND tv.supervisor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'gestor')
    )
);