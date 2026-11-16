CREATE OR REPLACE FUNCTION public.get_form_submission_date(p_submission_id uuid)
RETURNS date LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_value text; v_date date; v_submitted timestamptz;
BEGIN
  SELECT submitted_at INTO v_submitted FROM public.form_submissions WHERE id=p_submission_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  FOR v_value IN
    SELECT r.response_value #>> '{}' FROM public.form_responses r
    JOIN public.form_questions q ON q.id=r.question_id
    JOIN public.form_sections sec ON sec.id=q.section_id
    JOIN public.form_submissions s ON s.id=r.submission_id AND s.template_id=sec.template_id
    WHERE r.submission_id=p_submission_id AND q.question_type='date'
    ORDER BY CASE WHEN q.identification_role='visit_date' THEN 0 ELSE 1 END, sec.display_order,q.display_order,q.id
  LOOP
    IF v_value ~ '^\d{4}-\d{2}-\d{2}$' THEN
      BEGIN
        v_date := v_value::date;
        RETURN v_date;
      EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN NULL;
      END;
    END IF;
  END LOOP;
  RETURN (v_submitted AT TIME ZONE 'America/Sao_Paulo')::date;
END;
$$;
REVOKE ALL ON FUNCTION public.get_form_submission_date(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_form_submission_date(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_form_submission_dates(p_template_id uuid)
RETURNS TABLE(id uuid, visit_date date) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT s.id, public.get_form_submission_date(s.id) FROM public.form_submissions s WHERE s.template_id=p_template_id;
$$;
REVOKE ALL ON FUNCTION public.get_form_submission_dates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_form_submission_dates(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_unified_visits_for_dashboard()
 RETURNS TABLE(id uuid, visit_date date, manager text, client_code text, latitude numeric, longitude numeric, source text, template_name text, created_by uuid, rca_accompanied text, relationship_level integer, execution_level integer, delivery_level integer, has_mix_expansion_opportunities boolean, mix_expansion_details text, has_visibility_improvement_opportunities boolean, visibility_improvement_details text, additional_comments text, vendor_observations text, ruptures_description text, address text, pdf_path text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_is_admin boolean; v_uid uuid;
BEGIN
 v_uid := auth.uid(); v_is_admin := public.has_role(v_uid, 'admin');
 RETURN QUERY
 SELECT vf.id, vf.visit_date,
 COALESCE((SELECT public.format_manager_name(l.cod_rca_lopes) FROM public.manager_user_links l WHERE l.user_id=vf.created_by),vf.manager),
 vf.client_code,vf.latitude,vf.longitude,'legacy'::text,'Visita Comercial'::text,vf.created_by,
 vf.rca_accompanied,vf.relationship_level,vf.execution_level,vf.delivery_level,
 vf.has_mix_expansion_opportunities,vf.mix_expansion_details,vf.has_visibility_improvement_opportunities,vf.visibility_improvement_details,
 vf.additional_comments,vf.vendor_observations,vf.ruptures_description,vf.address,vf.pdf_path
 FROM public.visit_forms vf WHERE v_is_admin OR vf.created_by=v_uid
 UNION ALL
 SELECT s.id, public.get_form_submission_date(s.id),
 COALESCE(
 (SELECT public.format_manager_name(l.cod_rca_lopes) FROM public.manager_user_links l WHERE l.user_id=s.created_by),
 (SELECT public.format_manager_name(r.response_value #>> '{}') FROM public.form_responses r
 JOIN public.form_questions q ON q.id=r.question_id AND q.question_type='team_select'
 WHERE r.submission_id=s.id AND EXISTS (SELECT 1 FROM public.teams_vendors tv WHERE tv.cod_rca_lopes=(r.response_value #>> '{}'))
 ORDER BY q.display_order ASC LIMIT 1),'SEM GESTOR'::text),
 NULL::text,s.latitude,s.longitude,'pex'::text,t.name,s.created_by,
 NULL::text,NULL::integer,NULL::integer,NULL::integer,NULL::boolean,NULL::text,NULL::boolean,NULL::text,NULL::text,NULL::text,NULL::text,s.address,s.pdf_path
 FROM public.form_submissions s JOIN public.form_templates t ON t.id=s.template_id
 WHERE (v_is_admin OR s.created_by=v_uid) AND (
 EXISTS (SELECT 1 FROM public.manager_user_links l WHERE l.user_id=s.created_by)
 OR EXISTS (SELECT 1 FROM public.form_responses r JOIN public.form_questions q ON q.id=r.question_id AND q.question_type='team_select'
 JOIN public.teams_vendors tv ON tv.cod_rca_lopes=(r.response_value #>> '{}') WHERE r.submission_id=s.id))
 ORDER BY 2 DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_unified_visits_for_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unified_visits_for_dashboard() TO authenticated,service_role;