CREATE OR REPLACE FUNCTION public.sync_team_goals_from_vendors()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar nome_equipe na meta se o gestor mudou de equipe ou nome
  IF NEW.cargo IN ('coordenador', 'gerente', 'supervisor') THEN
    UPDATE team_daily_goals
    SET nome_equipe = CONCAT(
          NEW.nome_equipe, ' - ', 
          COALESCE(NEW.nome_rca, NEW.cod_rca_lopes), 
          ' (', INITCAP(NEW.cargo::text), ')'
        ),
        cod_equipe = NEW.cod_equipe
    WHERE cod_rca_lopes = NEW.cod_rca_lopes;
  END IF;
  
  RETURN NEW;
END;
$function$;