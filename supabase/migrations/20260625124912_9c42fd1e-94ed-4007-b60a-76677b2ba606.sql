
-- Revoke broad PUBLIC/anon execute from SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_active_form_templates() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_all_feedbacks_for_dashboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_all_visits_for_dashboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_top_managers_current_month() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_unified_visits_for_dashboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_visits_count_for_goal(text, text, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;

-- check_must_reset_password is called from the login page (pre-auth), keep anon access but remove PUBLIC default
REVOKE EXECUTE ON FUNCTION public.check_must_reset_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_must_reset_password(text) TO anon, authenticated;

-- Trigger-only functions: revoke from everyone except postgres/service_role
REVOKE EXECUTE ON FUNCTION public.set_created_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_team_goals_from_vendors() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_team_daily_goals_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
