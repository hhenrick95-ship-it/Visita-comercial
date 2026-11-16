CREATE TABLE IF NOT EXISTS public.manager_user_links (
  user_id uuid PRIMARY KEY,
  cod_rca_lopes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manager_user_links TO authenticated;
GRANT ALL ON public.manager_user_links TO service_role;
ALTER TABLE public.manager_user_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage manager links" ON public.manager_user_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users read own manager link" ON public.manager_user_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.format_manager_name(p_cod text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT regexp_replace(COALESCE(tv.nome_equipe, ''), '\s*-\s*.*$', '') || ' - ' ||
         regexp_replace(COALESCE(tv.nome_rca, tv.cod_rca_lopes), '^\w+\s*-\s*', '', 'i') ||
         ' (' || INITCAP(tv.cargo::text) || ')'
  FROM teams_vendors tv
  WHERE tv.cod_rca_lopes = p_cod
  ORDER BY (tv.cargo IN ('supervisor','gerente','coordenador')) DESC, tv.created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_unified_visits_for_dashboard()
 RETURNS TABLE(id uuid, visit_date date, manager text, client_code text, latitude numeric, longitude numeric, source text, template_name text, created_by uuid, rca_accompanied text, relationship_level integer, execution_level integer, delivery_level integer, has_mix_expansion_opportunities boolean, mix_expansion_details text, has_visibility_improvement_opportunities boolean, visibility_improvement_details text, additional_comments text, vendor_observations text, ruptures_description text, address text, pdf_path text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  v_is_admin := has_role(v_uid, 'admin');

  RETURN QUERY
  SELECT vf.id, vf.visit_date,
    COALESCE((SELECT format_manager_name(l.cod_rca_lopes) FROM manager_user_links l WHERE l.user_id = vf.created_by), vf.manager),
    vf.client_code, vf.latitude, vf.longitude, 'legacy'::text, 'Visita Comercial'::text, vf.created_by,
    vf.rca_accompanied, vf.relationship_level, vf.execution_level, vf.delivery_level,
    vf.has_mix_expansion_opportunities, vf.mix_expansion_details,
    vf.has_visibility_improvement_opportunities, vf.visibility_improvement_details,
    vf.additional_comments, vf.vendor_observations, vf.ruptures_description, vf.address, vf.pdf_path
  FROM visit_forms vf
  WHERE v_is_admin OR vf.created_by = v_uid

  UNION ALL

  SELECT s.id,
    (s.submitted_at AT TIME ZONE 'America/Sao_Paulo')::date,
    COALESCE(
      (SELECT format_manager_name(l.cod_rca_lopes) FROM manager_user_links l WHERE l.user_id = s.created_by),
      (SELECT format_manager_name(r.response_value #>> '{}')
         FROM form_responses r
         JOIN form_questions q ON q.id = r.question_id AND q.question_type = 'team_select'
         WHERE r.submission_id = s.id
           AND EXISTS (SELECT 1 FROM teams_vendors tv WHERE tv.cod_rca_lopes = (r.response_value #>> '{}'))
         ORDER BY q.display_order ASC LIMIT 1),
      'SEM GESTOR'::text),
    NULL::text, s.latitude, s.longitude, 'pex'::text, t.name, s.created_by,
    NULL::text, NULL::integer, NULL::integer, NULL::integer, NULL::boolean, NULL::text,
    NULL::boolean, NULL::text, NULL::text, NULL::text, NULL::text, s.address, s.pdf_path
  FROM form_submissions s
  JOIN form_templates t ON t.id = s.template_id
  WHERE (v_is_admin OR s.created_by = v_uid)
    AND (
      EXISTS (SELECT 1 FROM manager_user_links l WHERE l.user_id = s.created_by)
      OR EXISTS (
        SELECT 1 FROM form_responses r
        JOIN form_questions q ON q.id = r.question_id AND q.question_type = 'team_select'
        JOIN teams_vendors tv ON tv.cod_rca_lopes = (r.response_value #>> '{}')
        WHERE r.submission_id = s.id)
    )
  ORDER BY 2 DESC;
END;
$function$;