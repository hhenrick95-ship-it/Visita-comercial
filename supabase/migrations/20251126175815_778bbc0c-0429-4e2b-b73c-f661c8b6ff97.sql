-- Adicionar nova coluna nome_rca e renomear cod_vendedor para cod_rca_lopes
ALTER TABLE public.teams_vendors 
ADD COLUMN nome_rca TEXT;

-- Renomear a coluna cod_vendedor para cod_rca_lopes
ALTER TABLE public.teams_vendors 
RENAME COLUMN cod_vendedor TO cod_rca_lopes;

-- Atualizar a coluna para NOT NULL após preencher dados
-- (será preenchida via importação CSV ou manualmente)
