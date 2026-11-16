-- 1) O novo papel 'vendedor' passa a ser considerado aprovado (usa os mesmos RPCs de escrita).
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'gestor'::app_role, 'usuario'::app_role, 'vendedor'::app_role)
  );
$function$;

-- 2) Busca de clientes apenas para a pesquisa de satisfação: devolve somente
--    código, razão social, fantasia, CNPJ e cidade/UF. Não expõe telefone,
--    e-mail, checkouts ou fotos. Admin, gestor e vendedor podem chamar.
CREATE OR REPLACE FUNCTION public.search_clientes_pesquisa(p_term text DEFAULT NULL)
 RETURNS TABLE (codcli bigint, razao_social text, nome_fantasia text, cnpj text, cidade text, uf text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'vendedor')
  ) THEN
    RETURN;
  END IF;

  v_digits := regexp_replace(COALESCE(p_term, ''), '\D', '', 'g');

  RETURN QUERY
  SELECT c.codcli, c.razao_social, c.nome_fantasia, c.cnpj, c.cidade, c.uf
  FROM public.clientes_cadastro c
  WHERE p_term IS NULL
     OR btrim(p_term) = ''
     OR (v_digits <> '' AND c.codcli::text = v_digits)
     OR c.razao_social ILIKE '%' || p_term || '%'
     OR c.nome_fantasia ILIKE '%' || p_term || '%'
     OR (v_digits <> '' AND c.cnpj LIKE '%' || v_digits || '%')
  ORDER BY c.razao_social
  LIMIT 50;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_clientes_pesquisa(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.search_clientes_pesquisa(text) TO authenticated;

-- 3) Resultados da pesquisa de satisfação, somente para admin e gestor.
--    Uma linha por envio, com as 12 notas em um objeto JSONB.
CREATE OR REPLACE FUNCTION public.get_satisfaction_survey_results()
 RETURNS TABLE (
   id uuid,
   submitted_at timestamptz,
   client_code text,
   client_name text,
   client_cnpj text,
   supervisor_cod text,
   rca_cod text,
   scores jsonb
 )
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.submitted_at,
    COALESCE(
      NULLIF(s.metadata -> 'client_data' ->> 'codcli', ''),
      split_part(COALESCE(s.metadata ->> 'client', ''), ' - ', 1),
      ''
    )::text AS client_code,
    COALESCE(
      NULLIF(s.metadata -> 'client_data' ->> 'nome_fantasia', ''),
      NULLIF(s.metadata -> 'client_data' ->> 'razao_social', ''),
      split_part(COALESCE(s.metadata ->> 'client', ''), ' - ', 2),
      ''
    )::text AS client_name,
    COALESCE(s.metadata -> 'client_data' ->> 'cnpj', '')::text AS client_cnpj,
    COALESCE(s.metadata ->> 'supervisor', '')::text AS supervisor_cod,
    COALESCE(s.metadata ->> 'rca', '')::text AS rca_cod,
    COALESCE(agg.scores, '{}'::jsonb) AS scores
  FROM public.form_submissions s
  JOIN public.form_templates t
    ON t.id = s.template_id
   AND t.slug = 'pesquisa-satisfacao'
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(q.metric_name, (r.response_value #>> '{}')::numeric) AS scores
    FROM public.form_responses r
    JOIN public.form_questions q ON q.id = r.question_id
    WHERE r.submission_id = s.id
      AND q.metric_category = 'satisfacao'
      AND q.metric_name IS NOT NULL
      AND (r.response_value #>> '{}') ~ '^[0-9]+([.][0-9]+)?$'
  ) agg ON TRUE
  ORDER BY s.submitted_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_satisfaction_survey_results() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_satisfaction_survey_results() TO authenticated;