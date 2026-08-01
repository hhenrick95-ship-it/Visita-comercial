CREATE OR REPLACE FUNCTION public.get_top_managers_current_month()
RETURNS TABLE(manager text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT manager, COUNT(*)::bigint AS count
  FROM visit_forms
  WHERE visit_date >= date_trunc('month', CURRENT_DATE)::date
    AND auth.uid() IS NOT NULL
  GROUP BY manager
  ORDER BY count DESC
  LIMIT 5
$$;