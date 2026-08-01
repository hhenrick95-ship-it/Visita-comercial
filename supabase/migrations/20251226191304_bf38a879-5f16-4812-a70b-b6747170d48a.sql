-- Adicionar novo role 'usuario' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'usuario';

-- Atualizar política RLS para visitas: usuários normais NÃO veem visitas sem created_by
DROP POLICY IF EXISTS "Users read own visit forms" ON public.visit_forms;

CREATE POLICY "Users read own visit forms" 
ON public.visit_forms 
FOR SELECT 
USING (
  -- Admin e Gestor veem tudo (incluindo NULL)
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gestor'::app_role)
  -- Usuário normal só vê suas próprias visitas (não NULL)
  OR (created_by = auth.uid() AND created_by IS NOT NULL)
);