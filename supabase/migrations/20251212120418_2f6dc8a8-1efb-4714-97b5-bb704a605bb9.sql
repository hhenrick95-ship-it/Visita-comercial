-- Criar enum para os cargos
CREATE TYPE team_role AS ENUM ('coordenador', 'supervisor', 'vendedor');

-- Adicionar colunas de hierarquia na tabela teams_vendors
ALTER TABLE teams_vendors 
  ADD COLUMN cargo team_role DEFAULT 'vendedor',
  ADD COLUMN supervisor_id UUID REFERENCES teams_vendors(id) ON DELETE SET NULL;

-- Índices para performance nas consultas de hierarquia
CREATE INDEX idx_teams_vendors_cargo ON teams_vendors(cargo);
CREATE INDEX idx_teams_vendors_supervisor_id ON teams_vendors(supervisor_id);

-- Migrar dados existentes: registros onde cod_rca_lopes parece ser coordenador/supervisor (código igual ao da equipe ou nome similar)
-- Registros onde o código RCA é igual ao código da equipe são provavelmente coordenadores
UPDATE teams_vendors 
SET cargo = 'coordenador' 
WHERE cod_rca_lopes = cod_equipe;

-- Registros onde nome_rca está vazio ou é nulo, marcar como supervisor
UPDATE teams_vendors 
SET cargo = 'supervisor' 
WHERE (nome_rca IS NULL OR nome_rca = '') AND cargo = 'vendedor';