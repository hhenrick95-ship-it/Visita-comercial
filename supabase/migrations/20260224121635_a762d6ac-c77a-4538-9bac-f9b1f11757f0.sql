-- Fix duplicated manager names in visit_forms
-- Pattern: "EQUIPE X - NAME1 - X - NAME2 (Cargo)" → "EQUIPE X - NAME2 (Cargo)"

-- 1. Fix "EQUIPE D -  ROUSIANE GARCIA - D - ROUSIANE GARCIA DA CUNHA (Coordenador)"
UPDATE visit_forms 
SET manager = 'EQUIPE D - ROUSIANE GARCIA DA CUNHA (Coordenador)'
WHERE manager = 'EQUIPE D -  ROUSIANE GARCIA - D - ROUSIANE GARCIA DA CUNHA (Coordenador)';

-- 2. Fix "EQUIPE E - RICARDO LIMA E SILVA FILHO - E - RICARDO LIMA E SILVA FILHO (Supervisor)"
UPDATE visit_forms 
SET manager = 'EQUIPE E - RICARDO LIMA E SILVA FILHO (Supervisor)'
WHERE manager = 'EQUIPE E - RICARDO LIMA E SILVA FILHO - E - RICARDO LIMA E SILVA FILHO (Supervisor)';

-- 3. Fix truncated "EQUIPE E - RICARDO LIMA (Supervisor)" → full name
UPDATE visit_forms 
SET manager = 'EQUIPE E - RICARDO LIMA E SILVA FILHO (Supervisor)'
WHERE manager = 'EQUIPE E - RICARDO LIMA (Supervisor)';

-- 4. Fix "EQUIPE F - KAMILA SAMPAIO - F - KAMILA SAMPAIO SANTOS (Supervisor)"
UPDATE visit_forms 
SET manager = 'EQUIPE F - KAMILA SAMPAIO SANTOS (Supervisor)'
WHERE manager = 'EQUIPE F - KAMILA SAMPAIO - F - KAMILA SAMPAIO SANTOS (Supervisor)';

-- 5. Fix "EQUIPE J - LUAN SAMUEL M. DE SOUZA - J - LUAN SAMUEL MACEDO DE SOUZA (Supervisor)"
UPDATE visit_forms 
SET manager = 'EQUIPE J - LUAN SAMUEL MACEDO DE SOUZA (Supervisor)'
WHERE manager = 'EQUIPE J - LUAN SAMUEL M. DE SOUZA - J - LUAN SAMUEL MACEDO DE SOUZA (Supervisor)';

-- 6. Fix truncated "EQUIPE J - LUAN SOUZA (Supervisor)" → full name
UPDATE visit_forms 
SET manager = 'EQUIPE J - LUAN SAMUEL MACEDO DE SOUZA (Supervisor)'
WHERE manager = 'EQUIPE J - LUAN SOUZA (Supervisor)';

-- 7. Fix "EQUIPE P - CARLOS MARQUES - P - CARLOS ALBERTO MARQUES SALGADO (Supervisor)"
UPDATE visit_forms 
SET manager = 'EQUIPE P - CARLOS ALBERTO MARQUES SALGADO (Supervisor)'
WHERE manager = 'EQUIPE P - CARLOS MARQUES - P - CARLOS ALBERTO MARQUES SALGADO (Supervisor)';

-- 8. Fix "EQUIPE H - RICARDO LIMA (Supervisor)" - This is in EQUIPE H where coordinator is JUBCE RIBEIRO
-- There's no supervisor named Ricardo Lima in EQUIPE H, so this might be a data entry error
-- Keeping as-is since we can't determine the correct value

-- Also fix the double space in teams_vendors nome_equipe for EQUIPE D
UPDATE teams_vendors 
SET nome_equipe = 'EQUIPE D - ROUSIANE GARCIA'
WHERE nome_equipe = 'EQUIPE D -  ROUSIANE GARCIA';
