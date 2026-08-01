
CREATE OR REPLACE FUNCTION public.get_unified_visits_for_dashboard()
RETURNS TABLE (
  id uuid,
  visit_date date,
  manager text,
  client_code text,
  latitude numeric,
  longitude numeric,
  source text,
  template_name text,
  created_by uuid,
  -- Campos detalhados (apenas legacy preenche)
  rca_accompanied text,
  relationship_level integer,
  execution_level integer,
  delivery_level integer,
  has_mix_expansion_opportunities boolean,
  mix_expansion_details text,
  has_visibility_improvement_opportunities boolean,
  visibility_improvement_details text,
  additional_comments text,
  vendor_observations text,
  ruptures_description text,
  address text,
  pdf_path text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  v_is_admin := has_role(v_uid, 'admin');

  RETURN QUERY
  -- Visitas legadas (formulário "Visita Comercial")
  SELECT
    vf.id,
    vf.visit_date,
    vf.manager,
    vf.client_code,
    vf.latitude,
    vf.longitude,
    'legacy'::text AS source,
    'Visita Comercial'::text AS template_name,
    vf.created_by,
    vf.rca_accompanied,
    vf.relationship_level,
    vf.execution_level,
    vf.delivery_level,
    vf.has_mix_expansion_opportunities,
    vf.mix_expansion_details,
    vf.has_visibility_improvement_opportunities,
    vf.visibility_improvement_details,
    vf.additional_comments,
    vf.vendor_observations,
    vf.ruptures_description,
    vf.address,
    vf.pdf_path
  FROM visit_forms vf
  WHERE v_is_admin OR vf.created_by = v_uid

  UNION ALL

  -- Submissões dos novos formulários (PEX e quaisquer futuros)
  SELECT
    s.id,
    (s.submitted_at AT TIME ZONE 'America/Sao_Paulo')::date AS visit_date,
    -- Resolve o nome do gestor a partir da primeira resposta team_select
    COALESCE(
      (
        SELECT
          regexp_replace(COALESCE(tv.nome_equipe, ''), '\s*-\s*.*$', '') ||
          ' - ' ||
          regexp_replace(COALESCE(tv.nome_rca, tv.cod_rca_lopes), '^\w+\s*-\s*', '', 'i') ||
          ' (' || INITCAP(tv.cargo::text) || ')'
        FROM form_responses r
        JOIN form_questions q ON q.id = r.question_id AND q.question_type = 'team_select'
        JOIN teams_vendors tv ON tv.cod_rca_lopes = (r.response_value #>> '{}')
        WHERE r.submission_id = s.id
        ORDER BY q.display_order ASC
        LIMIT 1
      ),
      'SEM GESTOR'::text
    ) AS manager,
    NULL::text AS client_code,
    s.latitude,
    s.longitude,
    'pex'::text AS source,
    t.name AS template_name,
    s.created_by,
    NULL::text AS rca_accompanied,
    NULL::integer AS relationship_level,
    NULL::integer AS execution_level,
    NULL::integer AS delivery_level,
    NULL::boolean AS has_mix_expansion_opportunities,
    NULL::text AS mix_expansion_details,
    NULL::boolean AS has_visibility_improvement_opportunities,
    NULL::text AS visibility_improvement_details,
    NULL::text AS additional_comments,
    NULL::text AS vendor_observations,
    NULL::text AS ruptures_description,
    s.address,
    s.pdf_path
  FROM form_submissions s
  JOIN form_templates t ON t.id = s.template_id
  WHERE (v_is_admin OR s.created_by = v_uid)
    AND EXISTS (
      SELECT 1
      FROM form_responses r
      JOIN form_questions q ON q.id = r.question_id AND q.question_type = 'team_select'
      JOIN teams_vendors tv ON tv.cod_rca_lopes = (r.response_value #>> '{}')
      WHERE r.submission_id = s.id
    )

  ORDER BY visit_date DESC;
END;
$$;
