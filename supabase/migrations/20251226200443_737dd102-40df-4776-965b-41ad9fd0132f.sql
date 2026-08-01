-- Create table for system documentation
CREATE TABLE public.system_documentation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.system_documentation ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone authenticated can read documentation
CREATE POLICY "Authenticated users can read documentation"
ON public.system_documentation
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Admins can manage documentation"
ON public.system_documentation
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default sections
INSERT INTO public.system_documentation (section_key, title, content, display_order) VALUES
('overview', 'Visão Geral do Sistema', '# Visão Geral

Este sistema foi desenvolvido para gerenciar visitas de campo, feedbacks e acompanhamento de equipes de vendas.

## Objetivo Principal
Facilitar o registro e análise de visitas realizadas pelos supervisores aos vendedores em campo.

## Principais Funcionalidades
- Registro de visitas com formulário dinâmico
- Dashboard com métricas e indicadores
- Gerenciamento de equipes
- Sistema de feedbacks
- Relatórios em PDF', 1),

('visits', 'Fluxo de Visitas', '# Fluxo de Visitas

## Como Registrar uma Visita

1. Acesse a página **Home**
2. Preencha os dados do vendedor e cliente
3. Responda às perguntas do formulário
4. Envie a visita

## Campos Importantes
- **Gestor**: Supervisior responsável
- **Vendedor Acompanhado**: Código do RCA
- **Código do Cliente**: Identificação do PDV

## Oportunidades
Marque oportunidades de:
- Expansão de mix
- Melhoria de visibilidade', 2),

('dashboard', 'Dashboard e Relatórios', '# Dashboard

## Indicadores Disponíveis

### KPIs Principais
- Total de Visitas
- Média de Relacionamento
- Média de Execução
- Média de Entrega

### Gráficos
- Visitas por período
- Métricas comparativas
- Oportunidades identificadas

### Filtros
- Por data
- Por gestor
- Por equipe', 3),

('teams', 'Gerenciamento de Equipes', '# Equipes

## Estrutura Hierárquica
- Coordenador
- Supervisor  
- Vendedor

## Metas Diárias
Cada equipe possui uma meta de visitas diárias configurável.

## Importação de Dados
Os dados de equipes podem ser importados via CSV.', 4),

('forms', 'Formulários Dinâmicos', '# Editor de Formulário

## Seções
O formulário é dividido em seções temáticas.

## Tipos de Perguntas
- Texto curto/longo
- Seleção única/múltipla
- Slider numérico
- Sim/Não
- Upload de imagem

## Lógica Condicional
Perguntas podem ser exibidas condicionalmente baseadas em respostas anteriores.', 5),

('feedbacks', 'Sistema de Feedbacks', '# Feedbacks

## Criando um Feedback

Após uma visita, o supervisor pode registrar um feedback contendo:
- Crítica construtiva
- Plano de ação

## Templates
É possível criar templates de feedback para reutilização.

## Exportação
Feedbacks podem ser exportados em PDF.', 6);