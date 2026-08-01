-- 1. Adicionar coluna cod_rca_lopes
ALTER TABLE team_daily_goals 
ADD COLUMN IF NOT EXISTS cod_rca_lopes text;

-- 2. Migrar dados existentes (mapear cod_equipe → cod_rca_lopes do gestor correto)
UPDATE team_daily_goals g
SET cod_rca_lopes = t.cod_rca_lopes,
    nome_equipe = CONCAT(
      t.nome_equipe, ' - ', 
      COALESCE(t.nome_rca, t.cod_rca_lopes), 
      ' (', INITCAP(t.cargo::text), ')'
    )
FROM teams_vendors t
WHERE t.cod_equipe = g.cod_equipe
  AND t.cargo IN ('coordenador', 'supervisor')
  AND (
    g.nome_equipe ILIKE '%' || t.nome_rca || '%'
    OR t.cod_rca_lopes = g.cod_equipe
  );

-- 3. Criar índice único parcial (apenas para não-nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_daily_goals_rca 
ON team_daily_goals(cod_rca_lopes) 
WHERE cod_rca_lopes IS NOT NULL;

-- 4. Função para contar visitas por meta com matching robusto
CREATE OR REPLACE FUNCTION get_visits_count_for_goal(
  p_cod_rca_lopes text,
  p_nome_equipe text,
  p_target_date date
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_nome_base text;
BEGIN
  -- Extrair nome base (sem cargo) para matching
  v_nome_base := regexp_replace(p_nome_equipe, '\s*\([^)]+\)\s*$', '', 'i');
  v_nome_base := trim(v_nome_base);
  
  SELECT COUNT(*) INTO v_count
  FROM visit_forms v
  WHERE v.visit_date = p_target_date
    AND (
      -- Match por nome formatado (sem cargo no final)
      regexp_replace(trim(v.manager), '\s*\([^)]+\)\s*$', '', 'i') = v_nome_base
      -- Match por código do gestor
      OR trim(v.manager) = p_cod_rca_lopes
    );
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 5. Trigger para sincronizar metas quando teams_vendors muda
CREATE OR REPLACE FUNCTION sync_team_goals_from_vendors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar nome_equipe na meta se o gestor mudou de equipe ou nome
  IF NEW.cargo IN ('coordenador', 'supervisor') THEN
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
$$;

-- 6. Criar trigger (drop se existir para evitar duplicatas)
DROP TRIGGER IF EXISTS trg_sync_team_goals ON teams_vendors;
CREATE TRIGGER trg_sync_team_goals
AFTER INSERT OR UPDATE ON teams_vendors
FOR EACH ROW
EXECUTE FUNCTION sync_team_goals_from_vendors();