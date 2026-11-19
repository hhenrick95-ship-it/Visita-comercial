-- A conta compartilhada do formulário Fotos Ajinomoto precisa pesquisar a
-- base ativa, mas não deve receber papel de Gestor nem permissão de escrita.
-- As políticas existentes continuam válidas para os demais usuários.

DROP POLICY IF EXISTS "Merchan consulta clientes ativos" ON public.clientes_cadastro;
CREATE POLICY "Merchan consulta clientes ativos"
ON public.clientes_cadastro
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) = 'merchan@distribuidoralopes.com'
  AND lower(btrim(coalesce(situacao, ''))) = 'ativo'
);

DROP POLICY IF EXISTS "Merchan consulta vinculos cliente RCA" ON public.clientes_cadastro_rcas;
CREATE POLICY "Merchan consulta vinculos cliente RCA"
ON public.clientes_cadastro_rcas
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) = 'merchan@distribuidoralopes.com'
  AND EXISTS (
    SELECT 1
    FROM public.clientes_cadastro cliente
    WHERE cliente.codcli = clientes_cadastro_rcas.codcli
      AND lower(btrim(coalesce(cliente.situacao, ''))) = 'ativo'
  )
);
