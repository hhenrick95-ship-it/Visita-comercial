import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { VisitMap } from "@/components/VisitMap";
import { VisitsList } from "@/components/VisitsList";
import { VisitsByDayTable } from "@/components/VisitsByDayTable";
import { LayoutConfigDialog } from "@/components/LayoutConfigDialog";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { RupturesPanel, RuptureData } from "@/components/RupturesPanel";
import { OpportunitiesPanel, OpportunityData } from "@/components/OpportunitiesPanel";
import { ActiveFiltersBar, ActiveFilter } from "@/components/ActiveFiltersBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Combobox } from "@/components/ui/combobox";
import { Calendar, TrendingUp, Users, Target, CheckCircle, XCircle, Edit, Plus, Trash2, Settings, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useVisitFilters } from "@/hooks/useVisitFilters";
import { normalizeManagerName, getShortManagerName, getBaseManagerName, extractTeamPrefix, extractCleanName } from "@/lib/normalizeManager";
import { DashboardSkeleton } from "@/components/skeletons";
import { PageHeader } from "@/components/PageHeader";
import { BarChart3 } from "lucide-react";
import { TemplateSelector } from "@/components/TemplateSelector";
import { SubmissionsList } from "@/components/SubmissionsList";
import { useFormTemplates, type FormTemplate } from "@/hooks/useFormTemplates";

interface VisitData {
  id: string;
  visit_date: string;
  manager: string;
  rca_accompanied: string;
  client_code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  relationship_level: number | null;
  execution_level: number | null;
  delivery_level: number | null;
  has_mix_expansion_opportunities: boolean;
  has_visibility_improvement_opportunities: boolean;
  mix_expansion_details?: string | null;
  visibility_improvement_details?: string | null;
  additional_comments?: string | null;
  source?: 'legacy' | 'pex';
  template_name?: string | null;
}

interface TeamGoal {
  id: string;
  cod_equipe: string;
  cod_rca_lopes: string | null;
  nome_equipe: string;
  meta_diaria: number;
}

interface GestorOption {
  cod_rca_lopes: string;
  nome_rca: string | null;
  nome_equipe: string;
  cargo: string;
  fullName: string; // Formato: "EQUIPE X - NOME (Cargo)"
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { templates: allTemplates } = useFormTemplates({ activeOnly: true });
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("visita");
  const selectedTemplate = useMemo<FormTemplate | null>(
    () => allTemplates.find((t) => t.slug === selectedTemplateSlug) || null,
    [allTemplates, selectedTemplateSlug],
  );
  const isVisitaTemplate = selectedTemplateSlug === "visita";
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<VisitData[]>([]);
  // Visitas filtradas SEM dedupe (uma linha por formulário enviado).
  // Usado na tabela "Visitas por Gestor/Dia" para refletir a quantidade
  // real de pesquisas realizadas, não 1 por gestor/dia.
  const [rawFilteredVisits, setRawFilteredVisits] = useState<VisitData[]>([]);
  const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
  const [feedbacksCount, setFeedbacksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<VisitData | null>(null);
  
  // Estado para edição de metas
  const [editGoalDialog, setEditGoalDialog] = useState(false);
  const [addGoalDialog, setAddGoalDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<TeamGoal | null>(null);
  const [newGoalValue, setNewGoalValue] = useState<number>(10);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [availableTeams, setAvailableTeams] = useState<{cod_equipe: string, nome_equipe: string}[]>([]);
  const [availableGestores, setAvailableGestores] = useState<GestorOption[]>([]);
  const [selectedGoalDay, setSelectedGoalDay] = useState<number | null>(null); // Dia selecionado nas metas

  // Layout configuration
  const ALL_COMPONENTS = ["goals", "kpis", "visitsByDay", "ruptures", "opportunities", "charts", "insights", "map", "visits"];
  const [componentOrder, setComponentOrder] = useState<string[]>(ALL_COMPONENTS);
  
  // Ruptures data
  const [ruptures, setRuptures] = useState<RuptureData[]>([]);
  const [rupturesLoading, setRupturesLoading] = useState(false);
  const [layoutConfigOpen, setLayoutConfigOpen] = useState(false);
  
  // Selected items for cross-filtering toggle
  const [selectedRuptureId, setSelectedRuptureId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

  // Filtros - Data em árvore com seleção múltipla (inicializa no mês/ano atual)
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedYears, setSelectedYears] = useState<string[]>([currentYear]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  const [filterClient, setFilterClient] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterManagers, setFilterManagers] = useState<string[]>([]);

  // Opções dinâmicas para os filtros
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [availableVendors, setAvailableVendors] = useState<string[]>([]);
  const [availableManagers, setAvailableManagers] = useState<string[]>([]);

  useEffect(() => {
    loadVisits();
    loadTeamGoals();
    loadAvailableTeams();
    loadLayoutConfig();
    loadFeedbacksCount();
    loadRupturesData();
  }, []);

  // Recalcular availableManagers quando gestores carregam (para resolver nomes truncados)
  useEffect(() => {
    if (visits.length > 0 && availableGestores.length > 0) {
      const teamMembersForNorm = availableGestores.map(g => ({
        cod_rca_lopes: g.cod_rca_lopes,
        nome_rca: g.nome_rca,
        nome_equipe: g.nome_equipe,
        cargo: g.cargo,
      }));
      const uniqueManagers = [...new Set(visits.map(v => normalizeManagerName(v.manager, teamMembersForNorm)))].sort();
      setAvailableManagers(uniqueManagers);
    }
  }, [visits, availableGestores]);

  useEffect(() => {
    applyFilters();
    loadFeedbacksCount();
  }, [visits, selectedYears, selectedMonths, filterClient, filterVendor, filterAddress, filterManagers]);

  // Funções auxiliares para normalização defensiva de tipos
  const parseBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 't' || value === '1' || value === 1) return true;
    if (value === 'false' || value === 'f' || value === '0' || value === 0) return false;
    return Boolean(value);
  };

  const parseNumber = (value: unknown, defaultVal: number = 0): number => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  const loadVisits = async () => {
    setLoading(true);
    try {
      // Função unificada: combina visitas legadas + submissões dos novos formulários (PEX, etc.)
      const { data, error } = await supabase.rpc("get_unified_visits_for_dashboard");

      if (error) throw error;

      // IDs das perguntas de comentários/detalhes na seção de oportunidades
      const COMMENTS_QUESTION_ID = "fa13ca73-683e-4310-9d1c-aa6475fbbcf9"; // Comentários Adicionais
      const VENDOR_OBS_QUESTION_ID = "abab077c-4750-433e-b960-9d5a131690fe"; // Observações sobre o vendedor
      
      // Buscar respostas de comentários para todas as visitas com oportunidades
      const visitIds = data?.map((v: any) => v.id) || [];
      let commentsMap: Record<string, { additionalComments?: string; vendorObservations?: string }> = {};
      
      if (visitIds.length > 0) {
        const { data: responses } = await supabase
          .from("form_responses")
          .select("visit_form_id, question_id, response_value")
          .in("visit_form_id", visitIds)
          .in("question_id", [COMMENTS_QUESTION_ID, VENDOR_OBS_QUESTION_ID]);
        
        if (responses) {
          responses.forEach((r: any) => {
            if (!commentsMap[r.visit_form_id]) {
              commentsMap[r.visit_form_id] = {};
            }
            const value = typeof r.response_value === 'string' 
              ? r.response_value 
              : r.response_value?.toString() || '';
            
            if (value.trim()) {
              if (r.question_id === COMMENTS_QUESTION_ID) {
                commentsMap[r.visit_form_id].additionalComments = value;
              } else if (r.question_id === VENDOR_OBS_QUESTION_ID) {
                commentsMap[r.visit_form_id].vendorObservations = value;
              }
            }
          });
        }
      }
      
      // Normalização defensiva dos tipos para garantir consistência
      const normalizedData: VisitData[] = (data || []).map((v: any) => {
        const comments = commentsMap[v.id] || {};
        // Combinar comentários adicionais e observações do vendedor
        const allComments = [
          comments.additionalComments,
          comments.vendorObservations
        ].filter(Boolean).join('\n\n');
        
        return {
          ...v,
          relationship_level: parseNumber(v.relationship_level, 0),
          execution_level: parseNumber(v.execution_level, 0),
          delivery_level: parseNumber(v.delivery_level, 0),
          has_mix_expansion_opportunities: parseBoolean(v.has_mix_expansion_opportunities),
          has_visibility_improvement_opportunities: parseBoolean(v.has_visibility_improvement_opportunities),
          additional_comments: allComments || v.additional_comments || null,
        };
      });
      
      // Log de diagnóstico para debug
      const mixCount = normalizedData.filter(v => v.has_mix_expansion_opportunities).length;
      const visibilityCount = normalizedData.filter(v => v.has_visibility_improvement_opportunities).length;
      const withComments = normalizedData.filter(v => v.additional_comments).length;
      console.log(`[Dashboard] Visitas: ${normalizedData.length}, Mix: ${mixCount}, Visibilidade: ${visibilityCount}, Com comentários: ${withComments}`);
      
      setVisits(normalizedData);
      
      // Extrair opções únicas para os filtros
      const uniqueClients = [...new Set(normalizedData.map(v => v.client_code))].sort();
      const uniqueVendors = [...new Set(normalizedData.map(v => v.rca_accompanied))].sort();
      // Normalização será recalculada com teamMembers via useEffect
      const uniqueManagers = [...new Set(normalizedData.map(v => normalizeManagerName(v.manager)))].sort();
      
      setAvailableClients(uniqueClients);
      setAvailableVendors(uniqueVendors);
      setAvailableManagers(uniqueManagers);
    } catch (error) {
      console.error("Erro ao carregar visitas:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("team_daily_goals")
        .select("*")
        .order("nome_equipe");

      if (error) throw error;
      setTeamGoals(data || []);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      toast.error("Erro ao carregar metas das equipes");
    }
  };

  const loadAvailableTeams = async () => {
    try {
      // Buscar equipes únicas
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams_vendors")
        .select("cod_equipe, nome_equipe");

      if (teamsError) throw teamsError;
      
      const uniqueTeams = Array.from(
        new Map(teamsData?.map(item => [item.cod_equipe, item]) || []).values()
      );
      setAvailableTeams(uniqueTeams);

      // Buscar coordenadores e supervisores para metas
      const { data: gestoresData, error: gestoresError } = await supabase
        .from("teams_vendors")
        .select("cod_rca_lopes, nome_rca, nome_equipe, cargo")
        .or("cargo.eq.coordenador,cargo.eq.gerente,cargo.eq.supervisor")
        .order("nome_equipe");

      if (gestoresError) throw gestoresError;

      const gestores: GestorOption[] = (gestoresData || []).map(g => {
        const cargoLabel = g.cargo === "coordenador" ? "Coordenador" : g.cargo === "gerente" ? "Gerente" : "Supervisor";
        const teamPrefix = extractTeamPrefix(g.nome_equipe);
        const cleanName = g.nome_rca ? extractCleanName(g.nome_rca) : g.cod_rca_lopes;
        return {
          ...g,
          cargo: g.cargo || "supervisor",
          fullName: `${teamPrefix} - ${cleanName} (${cargoLabel})`
        };
      });
      
      setAvailableGestores(gestores);
    } catch (error) {
      console.error("Erro ao carregar equipes:", error);
    }
  };

  const loadLayoutConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("dashboard_layout")
        .select("component_order")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (error) throw error;
      if (data?.component_order) {
        const savedOrder = data.component_order as string[];
        // Adiciona componentes novos que não estavam no layout salvo
        const missingComponents = ALL_COMPONENTS.filter(c => !savedOrder.includes(c));
        setComponentOrder([...savedOrder, ...missingComponents]);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de layout:", error);
    }
  };

  const loadFeedbacksCount = async () => {
    try {
      // Usar função SECURITY DEFINER para buscar todos os feedbacks no dashboard
      const { data: allFeedbacks, error } = await supabase.rpc("get_all_feedbacks_for_dashboard");

      if (error) throw error;
      
      let filtered = allFeedbacks || [];

      // Aplicar filtros de data baseado na seleção em árvore
      if (selectedMonths.length > 0) {
        const sortedMonths = [...selectedMonths].sort();
        const firstMonth = sortedMonths[0];
        const lastMonth = sortedMonths[sortedMonths.length - 1];
        filtered = filtered.filter(f => {
          const createdAt = f.created_at?.substring(0, 7);
          return createdAt >= firstMonth && createdAt <= lastMonth;
        });
      } else if (selectedYears.length > 0) {
        const sortedYears = [...selectedYears].sort();
        filtered = filtered.filter(f => {
          const year = f.created_at?.substring(0, 4);
          return sortedYears.includes(year);
        });
      }

      // Filtrar por vendedor se existir
      if (filterVendor) {
        filtered = filtered.filter(f => f.vendor_code === filterVendor);
      }

      setFeedbacksCount(filtered.length);
    } catch (error) {
      console.error("Erro ao carregar contagem de feedbacks:", error);
    }
  };

  // Carregar dados de rupturas
  const RUPTURES_QUESTION_ID = "35686fab-34b5-4c93-b6a2-72f342b3d02b";
  
  const loadRupturesData = async () => {
    setRupturesLoading(true);
    try {
      // Buscar respostas de rupturas com join de visit_forms
      const { data: responses, error } = await supabase
        .from("form_responses")
        .select(`
          id,
          response_value,
          visit_form_id,
          visit_forms!inner (
            id,
            client_code,
            rca_accompanied,
            manager,
            visit_date
          )
        `)
        .eq("question_id", RUPTURES_QUESTION_ID);

      if (error) throw error;

      const rupturesData: RuptureData[] = (responses || [])
        .filter((r: any) => {
          // Filtrar apenas respostas com valor válido (não vazio)
          const value = typeof r.response_value === 'string' 
            ? r.response_value 
            : JSON.stringify(r.response_value);
          return value && value.trim() && value !== '""' && value !== 'null';
        })
        .map((r: any) => ({
          id: r.id,
          description: typeof r.response_value === 'string' 
            ? r.response_value 
            : JSON.stringify(r.response_value).replace(/^"|"$/g, ''),
          clientCode: r.visit_forms?.client_code || '',
          vendor: r.visit_forms?.rca_accompanied || '',
          manager: r.visit_forms?.manager || '',
          date: r.visit_forms?.visit_date || '',
        }));

      setRuptures(rupturesData);
    } catch (error) {
      console.error("Erro ao carregar rupturas:", error);
    } finally {
      setRupturesLoading(false);
    }
  };

  const handleEditGoal = (goal: TeamGoal) => {
    setSelectedGoal(goal);
    setNewGoalValue(goal.meta_diaria);
    setEditGoalDialog(true);
  };

  const handleAddGoal = () => {
    setSelectedTeam("");
    setNewGoalValue(10);
    setAddGoalDialog(true);
  };

  const handleSaveGoal = async () => {
    if (!selectedGoal) return;

    try {
      const { error } = await supabase
        .from("team_daily_goals")
        .update({ meta_diaria: newGoalValue })
        .eq("id", selectedGoal.id);

      if (error) throw error;

      toast.success("Meta atualizada com sucesso!");
      setEditGoalDialog(false);
      loadTeamGoals();
    } catch (error) {
      console.error("Erro ao atualizar meta:", error);
      toast.error("Erro ao atualizar meta");
    }
  };

  const handleCreateGoal = async () => {
    if (!selectedTeam || newGoalValue < 1) {
      toast.error("Selecione um gestor e defina uma meta válida");
      return;
    }

    // Buscar gestor pelo cod_rca_lopes
    const gestor = availableGestores.find(g => g.cod_rca_lopes === selectedTeam);
    if (!gestor) return;

    try {
      // Buscar cod_equipe da equipe real
      const teamCodeMatch = gestor.nome_equipe.match(/EQUIPE\s+(\w)/i);
      const { data: teamData } = await supabase
        .from("teams_vendors")
        .select("cod_equipe")
        .eq("cod_rca_lopes", gestor.cod_rca_lopes)
        .maybeSingle();

      const { error } = await supabase
        .from("team_daily_goals")
        .insert({
          cod_equipe: teamData?.cod_equipe || gestor.cod_rca_lopes,
          cod_rca_lopes: gestor.cod_rca_lopes, // Código único do gestor
          nome_equipe: gestor.fullName, // Formato: "EQUIPE X - NOME (Cargo)"
          meta_diaria: newGoalValue
        });

      if (error) throw error;

      toast.success("Meta adicionada com sucesso!");
      setAddGoalDialog(false);
      loadTeamGoals();
    } catch (error: any) {
      console.error("Erro ao adicionar meta:", error);
      if (error.code === '23505') {
        toast.error("Este gestor já possui uma meta cadastrada");
      } else {
        toast.error("Erro ao adicionar meta");
      }
    }
  };

  const handleDeleteGoal = async (goal: TeamGoal) => {
    if (!confirm(`Deseja realmente remover a meta da equipe ${goal.nome_equipe}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("team_daily_goals")
        .delete()
        .eq("id", goal.id);

      if (error) throw error;

      toast.success("Meta removida com sucesso!");
      loadTeamGoals();
    } catch (error) {
      console.error("Erro ao remover meta:", error);
      toast.error("Erro ao remover meta");
    }
  };

  const applyFilters = () => {
    let filtered = visits;

    // Filtro de data em árvore (múltipla seleção)
    if (selectedMonths.length > 0) {
      // Se há meses selecionados, filtrar por eles
      filtered = filtered.filter(v => {
        const visitYearMonth = v.visit_date.substring(0, 7); // "YYYY-MM"
        return selectedMonths.includes(visitYearMonth);
      });
    } else if (selectedYears.length > 0) {
      // Se só anos selecionados, filtrar por eles
      filtered = filtered.filter(v => {
        const visitYear = v.visit_date.split('-')[0];
        return selectedYears.includes(visitYear);
      });
    }

    if (filterClient) {
      filtered = filtered.filter(v => v.client_code === filterClient);
    }

    if (filterVendor) {
      filtered = filtered.filter(v => v.rca_accompanied === filterVendor);
    }

    if (filterAddress) {
      filtered = filtered.filter(v => 
        v.address?.toLowerCase().includes(filterAddress.toLowerCase())
      );
    }

    if (filterManagers.length > 0) {
      // Comparar usando normalização para lidar com variações de formato
      const teamMembersForNorm = availableGestores.map(g => ({
        cod_rca_lopes: g.cod_rca_lopes,
        nome_rca: g.nome_rca,
        nome_equipe: g.nome_equipe,
        cargo: g.cargo,
      }));
      filtered = filtered.filter(v =>
        filterManagers.includes(normalizeManagerName(v.manager, teamMembersForNorm))
      );
    }

    // Sincronizado: todos os painéis (KPIs, mapa, lista, gráficos e a
    // tabela "Visitas por Gestor/Dia") usam o total real de formulários
    // enviados. Não deduplicamos por gestor/dia para manter consistência
    // entre o quadro e os demais relatórios.
    setFilteredVisits(filtered);
    setRawFilteredVisits(filtered);
  };

  const clearFilters = () => {
    setSelectedYears([]);
    setSelectedMonths([]);
    setFilterClient("");
    setFilterVendor("");
    setFilterAddress("");
    setFilterManagers([]);
  };

  // KPIs
  const totalVisits = filteredVisits.length;
  const activeManagers = new Set(filteredVisits.map(v => normalizeManagerName(v.manager))).size;
  const visitedClients = new Set(filteredVisits.map(v => v.client_code)).size;
  const avgRelationship = filteredVisits.reduce((sum, v) => sum + (v.relationship_level || 0), 0) / totalVisits || 0;
  const avgExecution = filteredVisits.reduce((sum, v) => sum + (v.execution_level || 0), 0) / totalVisits || 0;
  const avgDelivery = filteredVisits.reduce((sum, v) => sum + (v.delivery_level || 0), 0) / totalVisits || 0;
  const opportunitiesCount = filteredVisits.filter(v => 
    v.has_mix_expansion_opportunities || v.has_visibility_improvement_opportunities
  ).length;

  // Calcular período em dias
  const getPeriodDays = () => {
    if (selectedMonths.length > 0 || selectedYears.length > 0) {
      // Contar dias únicos com visitas no período filtrado
      return [...new Set(filteredVisits.map(v => v.visit_date))].length;
    }
    // Se não houver filtro de data, usar o intervalo dos dados
    const dates = filteredVisits.map(v => new Date(v.visit_date));
    if (dates.length === 0) return 0;
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const contextualKPIs = {
    totalVisits,
    totalFeedbacks: feedbacksCount,
    activeManagers,
    periodDays: getPeriodDays()
  };

  // Usar a função importada normalizeManagerName de @/lib/normalizeManager
  // (removida função local que fazia shadow do import e removia o cargo)

  // Função para extrair nome curto para display compacto
  const getShortGestorName = (fullName: string): string => {
    return getShortManagerName(fullName);
  };

  // Filtrar metas com base no filtro de gestor (considerando formato com/sem cargo)
  const filteredTeamGoals = filterManagers.length > 0
    ? teamGoals.filter(goal => {
        const normalizedGoal = getBaseManagerName(normalizeManagerName(goal.nome_equipe));
        return filterManagers.some(fm => {
          const normalizedFilter = getBaseManagerName(normalizeManagerName(fm));
          return normalizedGoal === normalizedFilter || goal.nome_equipe === fm;
        });
      })
    : teamGoals;

  // Filtrar managers para a tabela de visitas por dia - baseado nos filtros ativos
  const filteredManagersForTable = filterManagers.length > 0
    ? filterManagers
    : [...new Set(filteredVisits.map(v => normalizeManagerName(v.manager, availableGestores.map(g => ({
        cod_rca_lopes: g.cod_rca_lopes,
        nome_rca: g.nome_rca,
        nome_equipe: g.nome_equipe,
        cargo: g.cargo,
      })))))].sort();

  // Calcular progresso por equipe (por dia selecionado ou hoje) - respeitando filtros
  const getTeamProgress = (goal: TeamGoal, day?: number | null) => {
    let targetDate: string;
    if (day !== undefined && day !== null) {
      const now = new Date();
      const year = selectedMonths.length > 0 
        ? selectedMonths[0].split('-')[0] 
        : selectedYears.length > 0 
          ? selectedYears[0] 
          : now.getFullYear().toString();
      const month = selectedMonths.length > 0 
        ? selectedMonths[0].split('-')[1] 
        : (now.getMonth() + 1).toString().padStart(2, '0');
      targetDate = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    } else {
      targetDate = new Date().toISOString().split('T')[0];
    }

    // Extrair letra da equipe do goal (ex: "EQUIPE E - ..." -> "E")
    const goalTeamLetter = goal.nome_equipe.match(/EQUIPE\s+(\w)/i)?.[1]?.toUpperCase();
    const goalRcaCode = goal.cod_rca_lopes?.trim();

    const dayVisits = filteredVisits.filter(v => {
      if (v.visit_date !== targetDate) return false;
      const managerRaw = (v.manager || '').trim();

      // Strategy 1: Match por letra da equipe (mais confiável)
      if (goalTeamLetter) {
        const visitTeamLetter = managerRaw.match(/EQUIPE\s+(\w)/i)?.[1]?.toUpperCase();
        if (visitTeamLetter && visitTeamLetter === goalTeamLetter) return true;
      }

      // Strategy 2: Match por cod_rca_lopes
      if (goalRcaCode && managerRaw === goalRcaCode) return true;

      // Strategy 3: Match por código de equipe
      if (goal.cod_equipe && managerRaw === goal.cod_equipe.trim()) return true;

      // Strategy 4: Containment parcial (fallback)
      const goalClean = goal.nome_equipe.replace(/\s*\([^)]+\)\s*$/i, '').trim().toUpperCase();
      const visitClean = managerRaw.replace(/\s*\([^)]+\)\s*$/i, '').trim().toUpperCase();
      if (goalClean && visitClean && (goalClean.includes(visitClean) || visitClean.includes(goalClean))) return true;

      return false;
    }).length;

    return dayVisits;
  };
  
  // Obter dias disponíveis para o mês selecionado
  const getAvailableDaysForGoals = () => {
    const now = new Date();
    const year = selectedMonths.length > 0 
      ? parseInt(selectedMonths[0].split('-')[0]) 
      : selectedYears.length > 0 
        ? parseInt(selectedYears[0]) 
        : now.getFullYear();
    const month = selectedMonths.length > 0 
      ? parseInt(selectedMonths[0].split('-')[1]) - 1 
      : now.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const getMapBounds = (visits: VisitData[]) => {
    const coords = visits
      .filter(v => v.latitude && v.longitude)
      .map(v => ({ lat: Number(v.latitude), lng: Number(v.longitude) }));
    
    if (coords.length === 0) return "-23.5505,-46.6333,-23.5505,-46.6333";
    
    const minLat = Math.min(...coords.map(c => c.lat));
    const maxLat = Math.max(...coords.map(c => c.lat));
    const minLng = Math.min(...coords.map(c => c.lng));
    const maxLng = Math.max(...coords.map(c => c.lng));
    
    return `${minLat},${minLng},${maxLat},${maxLng}`;
  };

  const handleVisitClick = useCallback((visit: VisitData) => {
    setSelectedVisit(visit.id === selectedVisit?.id ? null : visit);
  }, [selectedVisit]);

  if (loading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <PageHeader
          icon={BarChart3}
          title="Dashboard de Visitas"
          description="Visualize métricas e rotas realizadas"
          actions={
            role === 'admin' ? (
              <Button onClick={() => setLayoutConfigOpen(true)} variant="outline" className="glass-card border-0">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Layout
              </Button>
            ) : null
          }
        />

        {/* Seletor de formulário (aparece quando há mais de 1 template ativo) */}
        <TemplateSelector
          value={selectedTemplateSlug}
          onValueChange={(slug) => setSelectedTemplateSlug(slug)}
        />

        {/* Quando template diferente de "visita", renderiza visão genérica e encerra */}
        {!isVisitaTemplate && selectedTemplate && (
          <SubmissionsList template={selectedTemplate} />
        )}

        {/* Conteúdo legado da Visita */}
        {isVisitaTemplate && (
        <>
        <DashboardFilters
          filters={{
            selectedYears,
            selectedMonths,
            filterClient,
            filterVendor,
            filterAddress,
            filterManagers,
          }}
          availableDates={visits.map(v => v.visit_date)}
          availableClients={availableClients}
          availableVendors={availableVendors}
          availableManagers={availableManagers}
          onDateSelectionChange={(years, months) => {
            setSelectedYears(years);
            setSelectedMonths(months);
          }}
          onClientChange={setFilterClient}
          onVendorChange={setFilterVendor}
          onAddressChange={setFilterAddress}
          onManagerChange={setFilterManagers}
          onClearFilters={() => {
            clearFilters();
            setSelectedRuptureId(null);
            setSelectedOpportunityId(null);
            toast.info("Todos os filtros foram removidos");
          }}
        />

        {/* Barra de Filtros Ativos */}
        {(() => {
          const activeFilters: ActiveFilter[] = [];
          
          if (selectedYears.length > 0 && selectedMonths.length === 0) {
            activeFilters.push({
              key: 'years',
              label: 'Anos',
              value: selectedYears.join(', '),
              onRemove: () => setSelectedYears([])
            });
          }
          
          if (selectedMonths.length > 0) {
            const monthLabels = selectedMonths.map(m => {
              const [year, month] = m.split('-');
              return `${month}/${year}`;
            }).join(', ');
            activeFilters.push({
              key: 'months',
              label: 'Meses',
              value: monthLabels,
              onRemove: () => setSelectedMonths([])
            });
          }
          
          if (filterManagers.length > 0) {
            activeFilters.push({
              key: 'manager',
              label: filterManagers.length > 1 ? 'Gestores' : 'Gestor',
              value: filterManagers
                .map(fm => fm.split(' - ')[1]?.split(' (')[0] || fm)
                .join(', '),
              onRemove: () => setFilterManagers([])
            });
          }
          
          if (filterClient) {
            activeFilters.push({
              key: 'client',
              label: 'Cliente',
              value: filterClient,
              onRemove: () => setFilterClient("")
            });
          }
          
          if (filterVendor) {
            activeFilters.push({
              key: 'vendor',
              label: 'Vendedor',
              value: filterVendor,
              onRemove: () => setFilterVendor("")
            });
          }
          
          if (filterAddress) {
            activeFilters.push({
              key: 'address',
              label: 'Endereço',
              value: filterAddress,
              onRemove: () => setFilterAddress("")
            });
          }
          
          return (
            <ActiveFiltersBar
              filters={activeFilters}
              onClearAll={() => {
                clearFilters();
                setSelectedRuptureId(null);
                setSelectedOpportunityId(null);
                toast.info("Todos os filtros foram removidos");
              }}
            />
          );
        })()}

        {/* Componentes Dinâmicos */}
        {componentOrder.map((componentId) => {
          switch (componentId) {
            case "goals":
              const availableDays = getAvailableDaysForGoals();
              const today = new Date().getDate();
              const displayDay = selectedGoalDay ?? today;
              
              return (
                <Card key="goals">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Metas Diárias
                        </CardTitle>
                        <CardDescription>
                          {selectedGoalDay ? `Dia ${selectedGoalDay}` : 'Progresso de hoje'}
                        </CardDescription>
                      </div>
                      {role === 'admin' && (
                        <Button onClick={handleAddGoal} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Seletor de dias */}
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
                      <Button
                        variant={selectedGoalDay === null ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs flex-shrink-0"
                        onClick={() => setSelectedGoalDay(null)}
                      >
                        Hoje
                      </Button>
                      {availableDays.map(day => (
                        <Button
                          key={day}
                          variant={selectedGoalDay === day ? "default" : "outline"}
                          size="sm"
                          className={`h-6 w-6 p-0 text-xs flex-shrink-0 ${day === today && selectedGoalDay !== day ? 'border-primary' : ''}`}
                          onClick={() => setSelectedGoalDay(day)}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Grid compacto de metas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[280px] overflow-y-auto">
                      {filteredTeamGoals.map((goal) => {
                        const visitsForDay = getTeamProgress(goal, selectedGoalDay);
                        const progressPercent = (visitsForDay / goal.meta_diaria) * 100;
                        const isComplete = visitsForDay >= goal.meta_diaria;
                        
                        return (
                          <div 
                            key={goal.id} 
                            className={`p-2 border rounded-md group relative ${isComplete ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}`}
                            title={goal.nome_equipe}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-medium text-xs truncate flex-1">
                                {getShortGestorName(goal.nome_equipe)}
                              </span>
                              {isComplete ? (
                                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Progress 
                                value={Math.min(progressPercent, 100)} 
                                className={`h-1.5 flex-1 ${isComplete ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                              />
                              <span className={`text-[10px] font-medium min-w-[28px] text-right ${isComplete ? 'text-green-600' : 'text-red-500'}`}>
                                {visitsForDay}/{goal.meta_diaria}
                              </span>
                            </div>

                            {/* Botões admin em hover */}
                            {role === 'admin' && (
                              <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 bg-background border rounded shadow-sm p-0.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => handleEditGoal(goal)}
                                >
                                  <Edit className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteGoal(goal)}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {filteredTeamGoals.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        {filterManagers.length > 0
                          ? `Nenhuma meta para ${filterManagers.join(', ')}`
                          : 'Nenhuma meta cadastrada'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );

            case "kpis":
              return (
                <div key="kpis" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Visitas</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalVisits}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gestores Ativos</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeManagers}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Clientes Visitados</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{visitedClients}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{opportunitiesCount}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Média Relacion.</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgRelationship.toFixed(1)}/5</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Média Execução</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgExecution.toFixed(1)}/5</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Média Entrega</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgDelivery.toFixed(1)}/5</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {((avgRelationship + avgExecution + avgDelivery) / 3).toFixed(1)}/5
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );

            case "visitsByDay":
              return <VisitsByDayTable key="visitsByDay" visits={rawFilteredVisits} allManagers={filteredManagersForTable} dailyGoal={7} />;

            case "ruptures":
              // Filtrar rupturas pelos filtros ativos
              const filteredRuptures = ruptures.filter(r => {
                // Filtro de data
                if (selectedMonths.length > 0) {
                  const ruptureYearMonth = r.date.substring(0, 7);
                  if (!selectedMonths.includes(ruptureYearMonth)) return false;
                } else if (selectedYears.length > 0) {
                  const ruptureYear = r.date.split('-')[0];
                  if (!selectedYears.includes(ruptureYear)) return false;
                }
                // Filtro de gestor
                if (filterManagers.length > 0 && !filterManagers.includes(r.manager)) return false;
                // Filtro de vendedor
                if (filterVendor && r.vendor !== filterVendor) return false;
                // Filtro de cliente
                if (filterClient && r.clientCode !== filterClient) return false;
                return true;
              });
              return (
                <RupturesPanel 
                  key="ruptures" 
                  ruptures={filteredRuptures} 
                  loading={rupturesLoading}
                  selectedItemId={selectedRuptureId}
                  onItemClick={(item) => {
                    // Toggle: se já está selecionado, desmarcar
                    if (selectedRuptureId === item.id) {
                      setSelectedRuptureId(null);
                      setSelectedOpportunityId(null);
                      setFilterClient("");
                      setFilterVendor("");
                      setFilterManagers([]);
                      toast.info("Filtros removidos");
                    } else {
                      // Selecionar e aplicar todos os filtros
                      setSelectedRuptureId(item.id);
                      setSelectedOpportunityId(null);
                      setFilterClient(item.clientCode);
                      setFilterVendor(item.vendor);
                      setFilterManagers([item.manager]);
                      toast.info(`Filtrado por visita: ${item.clientCode}`);
                    }
                  }}
                />
              );

            case "opportunities":
              // Transformar visitas filtradas em oportunidades
              const opportunitiesData: OpportunityData[] = filteredVisits
                .filter(v => v.has_mix_expansion_opportunities || v.has_visibility_improvement_opportunities)
                .map(v => {
                  let type: 'mix' | 'visibility' | 'both' = 'mix';
                  if (v.has_mix_expansion_opportunities && v.has_visibility_improvement_opportunities) {
                    type = 'both';
                  } else if (v.has_visibility_improvement_opportunities) {
                    type = 'visibility';
                  }
                  // Usar additional_comments como fonte de detalhes
                  const details = v.additional_comments || null;
                  
                  return {
                    id: v.id,
                    type,
                    mixDetails: v.has_mix_expansion_opportunities ? details : null,
                    visibilityDetails: v.has_visibility_improvement_opportunities ? details : null,
                    clientCode: v.client_code,
                    vendor: v.rca_accompanied,
                    manager: v.manager,
                    date: v.visit_date,
                  };
                });
              return (
                <OpportunitiesPanel 
                  key="opportunities" 
                  opportunities={opportunitiesData} 
                  loading={loading}
                  selectedItemId={selectedOpportunityId}
                  onItemClick={(item) => {
                    // Toggle: se já está selecionado, desmarcar
                    if (selectedOpportunityId === item.id) {
                      setSelectedOpportunityId(null);
                      setSelectedRuptureId(null);
                      setFilterClient("");
                      setFilterVendor("");
                      setFilterManagers([]);
                      toast.info("Filtros removidos");
                    } else {
                      // Selecionar e aplicar todos os filtros
                      setSelectedOpportunityId(item.id);
                      setSelectedRuptureId(null);
                      setFilterClient(item.clientCode);
                      setFilterVendor(item.vendor);
                      setFilterManagers([item.manager]);
                      toast.info(`Filtrado por visita: ${item.clientCode}`);
                    }
                  }}
                />
              );

            case "charts":
              return <DashboardCharts key="charts" visits={filteredVisits} highlightedVisit={selectedVisit} teamMembers={availableGestores} />;

            case "insights":
              // Construir datas para o painel de insights baseado na seleção em árvore
              let insightStartDate = "";
              let insightEndDate = "";
              
              if (selectedMonths.length > 0) {
                const sortedMonths = [...selectedMonths].sort();
                insightStartDate = `${sortedMonths[0]}-01`;
                insightEndDate = `${sortedMonths[sortedMonths.length - 1]}-31`;
              } else if (selectedYears.length > 0) {
                const sortedYears = [...selectedYears].sort();
                insightStartDate = `${sortedYears[0]}-01-01`;
                insightEndDate = `${sortedYears[sortedYears.length - 1]}-12-31`;
              }
              return (
                <AIInsightsPanel 
                  key="insights"
                  filters={{
                    startDate: insightStartDate,
                    endDate: insightEndDate,
                    manager: filterManagers.length === 1 ? filterManagers[0] : "",
                    rca: filterVendor,
                    clientCode: filterClient
                  }}
                  contextualKPIs={contextualKPIs}
                  availableTeams={availableTeams}
                  onAlertClick={(alert) => {
                    if (alert.relatedVendor) {
                      setFilterVendor(alert.relatedVendor);
                      toast.info(`Filtrado por vendedor: ${alert.relatedVendor}`);
                    }
                  }}
                  onOpportunityClick={(opportunity) => {
                    if (opportunity.clientCode) {
                      setFilterClient(opportunity.clientCode);
                      const visit = filteredVisits.find(v => v.client_code === opportunity.clientCode);
                      if (visit) {
                        setSelectedVisit(visit);
                        toast.info(`Cliente selecionado: ${opportunity.clientCode}`);
                      }
                    }
                  }}
                  onVendorClick={(vendor) => {
                    setFilterVendor(vendor);
                    toast.info(`Filtrado por vendedor: ${vendor}`);
                  }}
                />
              );

            case "map":
              return (
                <Card key="map">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Mapa de Visitas Interativo
                    </CardTitle>
                    <CardDescription>
                      Clique nos marcadores ou nas visitas abaixo para ver detalhes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredVisits.filter(v => v.latitude && v.longitude).length > 0 ? (
                      <div className="relative z-0 w-full h-[500px] rounded-lg overflow-hidden border">
                        <VisitMap 
                          visits={filteredVisits} 
                          selectedVisit={selectedVisit}
                          onVisitClick={handleVisitClick}
                          teamMembers={availableGestores}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-[500px] rounded-lg overflow-hidden border flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground text-sm">
                          Nenhuma visita com geolocalização encontrada
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );

            case "visits":
              return (
                <VisitsList 
                  key="visits"
                  visits={filteredVisits}
                  selectedVisit={selectedVisit}
                  onVisitClick={handleVisitClick}
                  teamMembers={availableGestores}
                />
              );

            default:
              return null;
          }
        })}
        </>
        )}
      </div>

      {/* Dialog para editar meta */}
      <Dialog open={editGoalDialog} onOpenChange={setEditGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta Diária</DialogTitle>
            <DialogDescription>
              Defina a meta diária de visitas para {selectedGoal?.nome_equipe}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Diária</label>
              <Input
                type="number"
                min="1"
                value={newGoalValue}
                onChange={(e) => setNewGoalValue(parseInt(e.target.value) || 0)}
                placeholder="Número de visitas"
              />
              <p className="text-xs text-muted-foreground">
                Defina quantas visitas esta equipe deve realizar por dia
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGoalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGoal}>
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar meta */}
      <Dialog open={addGoalDialog} onOpenChange={setAddGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Meta Diária</DialogTitle>
            <DialogDescription>
              Selecione uma equipe e defina sua meta diária de visitas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gestor (Coordenador/Supervisor)</label>
              <Combobox
                options={availableGestores
                  .filter(gestor => !teamGoals.some(g => g.cod_equipe === gestor.cod_rca_lopes))
                  .map(gestor => ({ value: gestor.cod_rca_lopes, label: gestor.fullName }))}
                value={selectedTeam}
                onValueChange={setSelectedTeam}
                placeholder="Selecione um gestor..."
                searchPlaceholder="Buscar gestor..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Diária</label>
              <Input
                type="number"
                min="1"
                value={newGoalValue}
                onChange={(e) => setNewGoalValue(parseInt(e.target.value) || 0)}
                placeholder="Número de visitas"
              />
              <p className="text-xs text-muted-foreground">
                Defina quantas visitas esta equipe deve realizar por dia
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGoalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGoal}>
              Adicionar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para configurar layout */}
      <LayoutConfigDialog
        open={layoutConfigOpen}
        onOpenChange={setLayoutConfigOpen}
        currentOrder={componentOrder}
        onOrderChange={setComponentOrder}
      />
    </Layout>
  );
}
