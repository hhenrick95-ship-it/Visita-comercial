-- Add unique constraint on cod_rca_lopes to enable native upsert
ALTER TABLE teams_vendors 
ADD CONSTRAINT teams_vendors_cod_rca_lopes_unique 
UNIQUE (cod_rca_lopes);