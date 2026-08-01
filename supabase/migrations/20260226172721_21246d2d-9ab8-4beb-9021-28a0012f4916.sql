
-- 1. Recriar a função sync_team_goals_from_vendors com lógica correta
CREATE OR REPLACE FUNCTION public.sync_team_goals_from_vendors()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_prefix text;
  v_clean_name text;
  v_formatted_name text;
BEGIN
  IF NEW.cargo IN ('coordenador', 'gerente', 'supervisor') THEN
    -- Extrair apenas o prefixo "EQUIPE X" de nome_equipe
    v_team_prefix := (regexp_match(NEW.nome_equipe, '^(EQUIPE\s+\w+)', 'i'))[1];
    IF v_team_prefix IS NULL THEN
      v_team_prefix := NEW.nome_equipe;
    END IF;

    -- Extrair nome limpo de nome_rca removendo prefixo de letra (ex: "M - " ou "E03 - ")
    IF NEW.nome_rca IS NOT NULL THEN
      v_clean_name := regexp_replace(NEW.nome_rca, '^\w+\s*-\s*', '', 'i');
    ELSE
      v_clean_name := NEW.cod_rca_lopes;
    END IF;

    -- Construir formato correto: "EQUIPE X - NOME COMPLETO (Cargo)"
    v_formatted_name := CONCAT(v_team_prefix, ' - ', v_clean_name, ' (', INITCAP(NEW.cargo::text), ')');

    UPDATE team_daily_goals
    SET nome_equipe = v_formatted_name,
        cod_equipe = NEW.cod_equipe
    WHERE cod_rca_lopes = NEW.cod_rca_lopes;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Limpar dados legados em visit_forms (padrão: "EQUIPE X - NOME - X - NOME (Cargo)")
-- Usa regex para extrair "EQUIPE X", o nome completo após a segunda letra, e o cargo
UPDATE visit_forms
SET manager = CONCAT(
  (regexp_match(manager, '^(EQUIPE\s+\w+)', 'i'))[1],
  ' - ',
  regexp_replace(
    (regexp_match(manager, '^\s*EQUIPE\s+\w+\s*-\s*.+?\s*-\s*\w+\d*\s*-\s*(.+)$', 'i'))[1],
    '^\s+', '', 'g'
  )
)
WHERE manager ~ '(?i)^EQUIPE\s+\w+\s*-\s*.+\s*-\s*\w+\d*\s*-\s*.+';

-- 3. Limpar dados legados em team_daily_goals (mesmo padrão)
UPDATE team_daily_goals
SET nome_equipe = CONCAT(
  (regexp_match(nome_equipe, '^(EQUIPE\s+\w+)', 'i'))[1],
  ' - ',
  regexp_replace(
    (regexp_match(nome_equipe, '^\s*EQUIPE\s+\w+\s*-\s*.+?\s*-\s*\w+\d*\s*-\s*(.+)$', 'i'))[1],
    '^\s+', '', 'g'
  )
)
WHERE nome_equipe ~ '(?i)^EQUIPE\s+\w+\s*-\s*.+\s*-\s*\w+\d*\s*-\s*.+';
