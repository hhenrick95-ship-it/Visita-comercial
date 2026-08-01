WITH s AS (
  SELECT DISTINCT ON (codcli::bigint)
    codcli::bigint AS codcli,
    NULLIF(btrim(cliente),'') AS razao_social,
    NULLIF(btrim(fantasia),'') AS nome_fantasia,
    NULLIF(btrim(cgcent),'') AS cnpj,
    NULLIF(btrim(tipofj),'') AS tipo_fj,
    NULLIF(btrim(ramo),'') AS ramo,
    NULLIF(btrim(endereco),'') AS endereco,
    NULLIF(btrim(bairro),'') AS bairro,
    NULLIF(btrim(rca1),'') AS cod_rca,
    NULLIF(btrim(nome_rca1),'') AS nome_rca,
    NULLIF(btrim(situacao),'') AS situacao,
    NULLIF(btrim(telent),'') AS telefone,
    NULLIF(btrim(email),'') AS email
  FROM public.clientes_import_staging
  WHERE NULLIF(btrim(codcli),'') IS NOT NULL
  ORDER BY codcli::bigint
)
INSERT INTO public.clientes_cadastro (
  codcli, razao_social, nome_fantasia, cnpj, tipo_fj, ramo_atividade,
  endereco, bairro, cod_rca, nome_rca, situacao, telefone, email, status_atualizacao
)
SELECT codcli, COALESCE(razao_social,'SEM NOME'), nome_fantasia, cnpj, tipo_fj, ramo,
       endereco, bairro, cod_rca, nome_rca, situacao, telefone, email, 'pendente'
FROM s
ON CONFLICT (codcli) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  cnpj = EXCLUDED.cnpj,
  tipo_fj = EXCLUDED.tipo_fj,
  endereco = EXCLUDED.endereco,
  bairro = EXCLUDED.bairro,
  cod_rca = EXCLUDED.cod_rca,
  nome_rca = EXCLUDED.nome_rca,
  situacao = EXCLUDED.situacao,
  nome_fantasia = CASE WHEN public.clientes_cadastro.status_atualizacao = 'atualizado'
                       THEN public.clientes_cadastro.nome_fantasia ELSE EXCLUDED.nome_fantasia END,
  ramo_atividade = CASE WHEN public.clientes_cadastro.status_atualizacao = 'atualizado'
                        THEN public.clientes_cadastro.ramo_atividade ELSE EXCLUDED.ramo_atividade END,
  telefone = CASE WHEN public.clientes_cadastro.status_atualizacao = 'atualizado'
                  THEN public.clientes_cadastro.telefone ELSE EXCLUDED.telefone END,
  email = CASE WHEN public.clientes_cadastro.status_atualizacao = 'atualizado'
               THEN public.clientes_cadastro.email ELSE EXCLUDED.email END,
  updated_at = now();

DELETE FROM public.clientes_cadastro_rcas r
WHERE EXISTS (SELECT 1 FROM public.clientes_import_staging st WHERE st.codcli::bigint = r.codcli);

INSERT INTO public.clientes_cadastro_rcas (codcli, cod_rca, nome_rca)
SELECT DISTINCT codcli, cod_rca, nome_rca FROM (
  SELECT codcli::bigint AS codcli, NULLIF(btrim(rca1),'') AS cod_rca, NULLIF(btrim(nome_rca1),'') AS nome_rca FROM public.clientes_import_staging
  UNION ALL SELECT codcli::bigint, NULLIF(btrim(rca2),''), NULLIF(btrim(nome_rca2),'') FROM public.clientes_import_staging
  UNION ALL SELECT codcli::bigint, NULLIF(btrim(rca3),''), NULLIF(btrim(nome_rca3),'') FROM public.clientes_import_staging
  UNION ALL SELECT codcli::bigint, NULLIF(btrim(rca4),''), NULLIF(btrim(nome_rca4),'') FROM public.clientes_import_staging
  UNION ALL SELECT codcli::bigint, NULLIF(btrim(rca5),''), NULLIF(btrim(nome_rca5),'') FROM public.clientes_import_staging
  UNION ALL SELECT codcli::bigint, NULLIF(btrim(rca6),''), NULLIF(btrim(nome_rca6),'') FROM public.clientes_import_staging
  UNION ALL SELECT codcli::bigint, NULLIF(btrim(rca7),''), NULLIF(btrim(nome_rca7),'') FROM public.clientes_import_staging
) x
WHERE cod_rca IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.clientes_cadastro c WHERE c.codcli = x.codcli);

DROP TABLE public.clientes_import_staging;