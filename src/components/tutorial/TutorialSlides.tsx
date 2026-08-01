import {
  Shield, Users, ClipboardList, BarChart3, MessageSquare, Settings, Sparkles,
  BookOpen, LogIn, UserCheck, Network, Lock, Home, FileText, MapPin, Camera,
  Download, Filter, Target, AlertTriangle, Lightbulb, Upload, Layers, GitBranch,
  Presentation, CheckCircle2
} from "lucide-react";
import { LucideIcon } from "lucide-react";

import tutorialHome from "@/assets/tutorial/home.png";
import tutorialDashboard from "@/assets/tutorial/dashboard.png";
import tutorialDashboardFilters from "@/assets/tutorial/dashboard-filters.png";
import tutorialVisitas from "@/assets/tutorial/visitas.png";
import tutorialFeedbacks from "@/assets/tutorial/feedbacks.png";
import tutorialFormBuilder from "@/assets/tutorial/form-builder.png";
import tutorialTeamManagement from "@/assets/tutorial/team-management.png";
import tutorialAuth from "@/assets/tutorial/auth.png";

export type SlideType = "cover" | "content" | "table" | "diagram" | "highlight";

export interface SlideItem {
  icon: string;
  text: string;
}

export interface SlideTableData {
  headers: string[];
  rows: string[][];
}

export interface SlideScreenshot {
  url: string;
  width?: number; // percentage width (default 100)
}

export interface SlideData {
  type: SlideType;
  title: string;
  subtitle?: string;
  items?: SlideItem[];
  table?: SlideTableData;
  diagramNodes?: { label: string; color: string }[];
  highlightValue?: string;
  highlightLabel?: string;
  highlightDescription?: string;
  screenshotUrl?: string;
  screenshotPosition?: string;
  screenshotLayout?: string;
  screenshots?: SlideScreenshot[];
  block: string;
}

export const iconMap: Record<string, LucideIcon> = {
  Shield, Users, ClipboardList, BarChart3, MessageSquare, Settings, Sparkles,
  BookOpen, LogIn, UserCheck, Network, Lock, Home, FileText, MapPin, Camera,
  Download, Filter, Target, AlertTriangle, Lightbulb, Upload, Layers, GitBranch,
  Presentation, CheckCircle2,
};

export const slides: SlideData[] = [
  // ===== BLOCO 1 - INTRODUÇÃO =====
  {
    type: "cover",
    title: "Store Check Sync",
    subtitle: "Sistema de Acompanhamento de Rotas Comerciais\nLOPES DISTRIBUIDORA",
    block: "Introdução",
  },
  {
    type: "content",
    title: "Objetivo do Sistema",
    items: [
      { icon: "ClipboardList", text: "Registrar visitas de campo com geolocalização e evidências fotográficas" },
      { icon: "BarChart3", text: "Gerar dashboards com KPIs em tempo real para tomada de decisão" },
      { icon: "MessageSquare", text: "Criar feedbacks estruturados com planos de ação para vendedores" },
      { icon: "Target", text: "Acompanhar metas diárias de visitas por equipe e supervisor" },
      { icon: "Sparkles", text: "Fornecer insights automáticos via Inteligência Artificial" },
    ],
    block: "Introdução",
  },
  {
    type: "table",
    title: "Perfis de Acesso ao Sistema",
    table: {
      headers: ["Perfil", "Papel no Sistema", "Exemplos de Acesso"],
      rows: [
        ["Admin", "Administrador geral", "Tudo: usuários, equipes, formulários, dashboard"],
        ["Gestor", "Supervisores e coordenadores", "Visitas, dashboard, feedbacks (filtrado por equipe)"],
        ["Usuário", "Operacional de campo", "Registrar visitas e visualizar próprios dados"],
      ],
    },
    block: "Introdução",
  },

  // ===== BLOCO 2 - ACESSO AO SISTEMA =====
  {
    type: "content",
    title: "Login e Cadastro",
    items: [
      { icon: "LogIn", text: "Acesse pelo navegador em qualquer dispositivo (desktop ou mobile)" },
      { icon: "Users", text: "Novos usuários fazem auto-registro com e-mail e senha" },
      { icon: "Lock", text: "Após o cadastro, o acesso fica pendente até aprovação do Admin" },
      { icon: "Shield", text: "Autenticação segura com criptografia e tokens JWT" },
    ],
    screenshotUrl: tutorialAuth,
    block: "Acesso ao Sistema",
  },
  {
    type: "diagram",
    title: "Fluxo de Aprovação de Usuários",
    diagramNodes: [
      { label: "Usuário faz cadastro", color: "bg-blue-600" },
      { label: "Status: Pendente", color: "bg-yellow-600" },
      { label: "Admin aprova e define perfil", color: "bg-indigo-600" },
      { label: "Acesso liberado ao sistema", color: "bg-emerald-600" },
    ],
    block: "Acesso ao Sistema",
  },
  {
    type: "diagram",
    title: "Hierarquia de Cargos nas Equipes",
    diagramNodes: [
      { label: "Coordenador / Gerente", color: "bg-purple-600" },
      { label: "Supervisor", color: "bg-blue-600" },
      { label: "Vendedor", color: "bg-teal-600" },
    ],
    subtitle: "Coordenador e Gerente possuem acesso a todos os vendedores da equipe.\nSupervisor visualiza apenas os vendedores vinculados a ele.\nVendedores não acessam o sistema diretamente.",
    block: "Acesso ao Sistema",
  },
  {
    type: "table",
    title: "Permissões por Perfil",
    table: {
      headers: ["Funcionalidade", "Admin", "Gestor", "Usuário"],
      rows: [
        ["Nova Visita", "✅", "✅", "✅"],
        ["Dashboard", "✅", "✅", "✅"],
        ["Feedbacks", "✅", "✅", "✅"],
        ["Listagem de Visitas", "✅", "✅", "✅"],
        ["Gestão de Usuários", "✅", "❌", "❌"],
        ["Gestão de Equipes", "✅", "❌", "❌"],
        ["Editor de Formulário", "✅", "❌", "❌"],
      ],
    },
    block: "Acesso ao Sistema",
  },

  // ===== BLOCO 3 - FORMULÁRIO DE VISITA =====
  {
    type: "content",
    title: "Tela Inicial do Sistema",
    items: [
      { icon: "Home", text: "Acesso rápido por cards: Nova Visita, Dashboard, Feedbacks" },
      { icon: "ClipboardList", text: "Iniciar novo formulário de visita com um clique" },
      { icon: "BarChart3", text: "Acesso direto ao painel de indicadores" },
      { icon: "MessageSquare", text: "Visualizar e criar feedbacks rapidamente" },
    ],
    screenshotUrl: tutorialHome,
    block: "Formulário de Visita",
  },
  {
    type: "diagram",
    title: "Preenchendo uma Visita — Passo a Passo",
    diagramNodes: [
      { label: "1. Selecionar Equipe", color: "bg-blue-600" },
      { label: "2. Escolher Vendedor", color: "bg-blue-500" },
      { label: "3. Informar Código do Cliente", color: "bg-indigo-600" },
      { label: "4. Responder Perguntas", color: "bg-indigo-500" },
      { label: "5. Enviar Formulário", color: "bg-emerald-600" },
    ],
    block: "Formulário de Visita",
  },
  {
    type: "content",
    title: "Geolocalização e Fotos",
    items: [
      { icon: "MapPin", text: "A localização GPS é capturada automaticamente ao abrir o formulário" },
      { icon: "Camera", text: "Upload de fotos como evidência da visita (prateleiras, PDV, etc.)" },
      { icon: "Shield", text: "Coordenadas são salvas junto ao registro para auditoria" },
      { icon: "CheckCircle2", text: "O endereço aproximado é exibido no mapa do Dashboard" },
    ],
    block: "Formulário de Visita",
  },
  {
    type: "highlight",
    title: "Geração Automática de PDF",
    highlightValue: "PDF",
    highlightLabel: "Gerado automaticamente ao enviar",
    highlightDescription: "Após o envio do formulário, um PDF completo é gerado com todas as respostas, fotos e localização. Pode ser baixado a qualquer momento pela listagem de visitas.",
    block: "Formulário de Visita",
  },
  {
    type: "content",
    title: "Listagem de Visitas",
    items: [
      { icon: "FileText", text: "Todas as visitas ficam disponíveis em /visitas com filtros avançados" },
      { icon: "Filter", text: "Filtre por gestor, vendedor, cliente, data ou período" },
      { icon: "Download", text: "Exporte visitas individuais em PDF ou a lista completa em CSV" },
      { icon: "CheckCircle2", text: "Visualize detalhes completos clicando em qualquer visita" },
    ],
    screenshotUrl: tutorialVisitas,
    block: "Formulário de Visita",
  },

  // ===== BLOCO 4 - DASHBOARD =====
  {
    type: "content",
    title: "Visão Geral do Dashboard",
    items: [
      { icon: "BarChart3", text: "KPIs principais: total de visitas, média de execução, positivação" },
      { icon: "MapPin", text: "Mapa interativo com localização de todas as visitas" },
      { icon: "Target", text: "Barras de progresso de metas diárias por supervisor" },
      { icon: "Layers", text: "Gráficos de distribuição por gestor, período e métricas" },
    ],
    screenshotUrl: tutorialDashboard,
    block: "Dashboard",
  },
  {
    type: "content",
    title: "Filtros Interativos (Estilo Power BI)",
    items: [
      { icon: "Filter", text: "Filtro cruzado: selecionar um gestor atualiza todos os gráficos" },
      { icon: "Users", text: "Filtro por gestor/supervisor com busca" },
      { icon: "FileText", text: "Filtro por código de cliente" },
      { icon: "BarChart3", text: "Seleção de período com calendário (data início e fim)" },
    ],
    screenshotUrl: tutorialDashboardFilters,
    block: "Dashboard",
  },
  {
    type: "content",
    title: "Metas Diárias de Visitas",
    items: [
      { icon: "Target", text: "Cada supervisor tem uma meta diária configurável" },
      { icon: "BarChart3", text: "Barra de progresso mostra visitas realizadas vs. meta" },
      { icon: "CheckCircle2", text: "Meta batida: barra verde com indicação visual" },
      { icon: "AlertTriangle", text: "Meta não atingida: barra vermelha como alerta" },
    ],
    block: "Dashboard",
  },
  {
    type: "content",
    title: "Rupturas e Oportunidades",
    items: [
      { icon: "AlertTriangle", text: "Painel de Rupturas: lista visitas com ruptura informada" },
      { icon: "Lightbulb", text: "Painel de Oportunidades: expansão de mix, visibilidade, ativações" },
      { icon: "Filter", text: "Filtro cruzado com o dashboard principal" },
      { icon: "Download", text: "Dados podem ser exportados para análise externa" },
    ],
    block: "Dashboard",
  },

  // ===== BLOCO 5 - FEEDBACKS =====
  {
    type: "content",
    title: "O que são Feedbacks?",
    items: [
      { icon: "MessageSquare", text: "Ferramenta para registrar crítica construtiva sobre uma visita" },
      { icon: "FileText", text: "Inclui plano de ação com melhorias específicas para o vendedor" },
      { icon: "Users", text: "Vinculado ao supervisor e vendedor da visita original" },
      { icon: "Download", text: "Exportável em PDF para compartilhamento e acompanhamento" },
    ],
    screenshotUrl: tutorialFeedbacks,
    block: "Feedbacks",
  },
  {
    type: "diagram",
    title: "Criando um Feedback",
    diagramNodes: [
      { label: "1. Selecionar uma visita", color: "bg-blue-600" },
      { label: "2. Escolher template (opcional)", color: "bg-indigo-600" },
      { label: "3. Escrever crítica construtiva", color: "bg-purple-600" },
      { label: "4. Definir plano de ação", color: "bg-violet-600" },
      { label: "5. Salvar e exportar PDF", color: "bg-emerald-600" },
    ],
    block: "Feedbacks",
  },
  {
    type: "highlight",
    title: "Exportação de Feedbacks",
    highlightValue: "PDF",
    highlightLabel: "Feedback completo em documento profissional",
    highlightDescription: "Cada feedback pode ser exportado em PDF contendo: dados da visita, crítica construtiva, plano de ação, supervisor responsável e data. Ideal para apresentações e acompanhamento individual.",
    block: "Feedbacks",
  },

  // ===== BLOCO 6 - ADMINISTRAÇÃO =====
  {
    type: "content",
    title: "Gestão de Usuários (Admin)",
    items: [
      { icon: "UserCheck", text: "Aprovar novos cadastros pendentes e definir perfil (Admin/Gestor/Usuário)" },
      { icon: "Lock", text: "Resetar senhas de usuários com senha temporária" },
      { icon: "Users", text: "Editar perfis e alterar níveis de acesso" },
      { icon: "Shield", text: "Remover usuários quando necessário" },
    ],
    block: "Administração",
  },
  {
    type: "content",
    title: "Gestão de Equipes (Admin)",
    items: [
      { icon: "Users", text: "Cadastrar equipes com código, nome e vendedores" },
      { icon: "Upload", text: "Importação em massa via planilha XLSX" },
      { icon: "Network", text: "Definir hierarquia: Coordenador → Supervisor → Vendedor" },
      { icon: "Target", text: "Configurar metas diárias individuais por supervisor" },
    ],
    screenshotUrl: tutorialTeamManagement,
    block: "Administração",
  },
  {
    type: "content",
    title: "Editor de Formulário (Admin)",
    items: [
      { icon: "Layers", text: "Criar e organizar seções do formulário de visita" },
      { icon: "ClipboardList", text: "Adicionar perguntas: texto, número, slider, sim/não, seleção" },
      { icon: "GitBranch", text: "Configurar lógica condicional (perguntas dependentes)" },
      { icon: "Settings", text: "Definir quais perguntas geram métricas para o dashboard" },
    ],
    screenshotUrl: tutorialFormBuilder,
    block: "Administração",
  },
  {
    type: "content",
    title: "Lógica Condicional no Formulário",
    items: [
      { icon: "GitBranch", text: "Perguntas podem aparecer ou ocultar com base em respostas anteriores" },
      { icon: "CheckCircle2", text: 'Exemplo: "Detalhes da ruptura" só aparece se "Há ruptura?" = Sim' },
      { icon: "Layers", text: "Configurável pelo admin no Editor de Formulário" },
      { icon: "Sparkles", text: "Torna o formulário dinâmico e mais rápido de preencher" },
    ],
    block: "Administração",
  },

  // ===== BLOCO 7 - RECURSOS EXTRAS =====
  {
    type: "content",
    title: "Insights com Inteligência Artificial",
    items: [
      { icon: "Sparkles", text: "Chat com IA para perguntas sobre os dados das visitas" },
      { icon: "Lightbulb", text: "Painel de insights automáticos com análise de tendências" },
      { icon: "BarChart3", text: "Identificação de padrões e anomalias nos dados" },
      { icon: "Target", text: "Sugestões de ações baseadas nos indicadores" },
    ],
    block: "Recursos Extras",
  },
  {
    type: "content",
    title: "Documentação do Sistema",
    items: [
      { icon: "BookOpen", text: "Manual técnico completo acessível em /documentation" },
      { icon: "FileText", text: "12 seções: arquitetura, dados, segurança, regras de negócio" },
      { icon: "Download", text: "Exportável em PDF para consulta offline" },
      { icon: "Presentation", text: "Este tutorial também está disponível no menu do sistema" },
    ],
    block: "Recursos Extras",
  },
  {
    type: "cover",
    title: "Obrigado!",
    subtitle: "LOPES DISTRIBUIDORA\nStore Check Sync — Sistema de Acompanhamento de Rotas Comerciais\n\nDúvidas? Procure o administrador do sistema.",
    block: "Encerramento",
  },
];
