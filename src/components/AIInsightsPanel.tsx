import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, Users, FileText, ChevronDown, ChevronUp, Download, Filter, X } from 'lucide-react';
import { useAIInsights, type AnalysisType } from '@/hooks/useAIInsights';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Combobox } from '@/components/ui/combobox';
import { InsightsSummaryCard } from './InsightsSummaryCard';

interface AIInsightsPanelProps {
  filters: {
    startDate?: string;
    endDate?: string;
    manager?: string;
    rca?: string;
    clientCode?: string;
  };
  contextualKPIs?: {
    totalVisits: number;
    totalFeedbacks: number;
    activeManagers: number;
    periodDays: number;
  };
  availableTeams?: Array<{ cod_equipe: string; nome_equipe: string }>;
  onAlertClick?: (alert: any) => void;
  onOpportunityClick?: (opportunity: any) => void;
  onVendorClick?: (vendor: string) => void;
  defaultAnalysisType?: AnalysisType;
  feedbacksOnly?: boolean;
  /** When provided, the AI analyses this template's submissions instead of the legacy visit_forms table. */
  templateId?: string;
  templateName?: string;
}

const analysisTypeLabels: Record<AnalysisType, string> = {
  general: 'Análise Geral',
  manager_performance: 'Desempenho por Gestor',
  team_performance: 'Desempenho por Equipe',
  rca_coverage: 'Cobertura de RCAs',
  client_analysis: 'Análise por Cliente',
  problems: 'Problemas e Alertas',
  opportunities: 'Oportunidades',
  comments_analysis: 'Análise de Comentários',
  comparative: 'Análise Comparativa (Períodos)',
  feedback_analysis: 'Análise de Feedbacks'
};

export function AIInsightsPanel({ filters, contextualKPIs, availableTeams, onAlertClick, onOpportunityClick, onVendorClick, defaultAnalysisType, feedbacksOnly, templateId, templateName }: AIInsightsPanelProps) {
  const { insights, loading, error, lastAnalysisTime, generateInsights } = useAIInsights();
  const [analysisType, setAnalysisType] = useState<AnalysisType>(defaultAnalysisType || 'general');
  
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());
  const [expandedOpportunities, setExpandedOpportunities] = useState<Set<number>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());
  
  // Filtros avançados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedClientType, setSelectedClientType] = useState<string>('');
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  // Carregar regiões disponíveis
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const { data } = await supabase
          .from('visit_forms')
          .select('address')
          .not('address', 'is', null);
        
        if (data) {
          const regions = new Set<string>();
          data.forEach(v => {
            if (v.address) {
              // Extrair cidade/estado do endereço
              const parts = v.address.split(',').map(p => p.trim());
              if (parts.length >= 2) {
                const cityState = parts[parts.length - 2] + ', ' + parts[parts.length - 1];
                regions.add(cityState);
              }
            }
          });
          setAvailableRegions(Array.from(regions).sort());
        }
      } catch (error) {
        console.error('Error loading regions:', error);
      }
    };
    
    loadRegions();
  }, []);

  // Salvar ações completadas no localStorage
  const toggleActionComplete = (index: number) => {
    const newCompleted = new Set(completedActions);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedActions(newCompleted);
    localStorage.setItem('ai_insights_completed_actions', JSON.stringify(Array.from(newCompleted)));
  };

  const toggleAlertExpand = (index: number) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedAlerts(newExpanded);
  };

  const toggleOpportunityExpand = (index: number) => {
    const newExpanded = new Set(expandedOpportunities);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedOpportunities(newExpanded);
  };

  // Carregar ações completadas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_insights_completed_actions');
    if (saved) {
      try {
        setCompletedActions(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error loading completed actions:', e);
      }
    }
  }, []);

  // Auto-geração removida - IA só roda ao clicar no botão "Gerar Análise"

  const handleGenerate = () => {
    // Validar se análise comparativa tem as datas necessárias
    if (analysisType === 'comparative' && (!filters.startDate || !filters.endDate)) {
      return;
    }
    const advancedFilters = {
      ...filters,
      team: selectedTeam || undefined,
      region: selectedRegion || undefined,
      clientType: selectedClientType || undefined,
      templateId: templateId || undefined,
    };
    generateInsights(advancedFilters, analysisType, true); // skipCache = true para forçar nova análise
  };

  const clearAdvancedFilters = () => {
    setSelectedTeam('');
    setSelectedRegion('');
    setSelectedClientType('');
  };

  const canGenerateComparative = analysisType === 'comparative' && filters.startDate && filters.endDate;

  const exportToPDF = () => {
    if (!insights) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Análise Inteligente - Insights', margin, yPosition);
      yPosition += 10;

      // Tipo de análise e data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo: ${analysisTypeLabels[analysisType]}`, margin, yPosition);
      yPosition += 5;
      if (lastAnalysisTime) {
        doc.text(`Gerado: ${lastAnalysisTime.toLocaleString('pt-BR')}`, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 5;

      // KPIs Contextuais
      if (contextualKPIs) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('KPIs do Período', margin, yPosition);
        yPosition += 7;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Visitas: ${contextualKPIs.totalVisits} | Feedbacks: ${contextualKPIs.totalFeedbacks} | Gestores: ${contextualKPIs.activeManagers} | Período: ${contextualKPIs.periodDays} dias`, margin, yPosition);
        yPosition += 10;
      }

      // Resumo
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Executivo', margin, yPosition);
      yPosition += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(insights.summary.replace(/[#*_]/g, ''), pageWidth - 2 * margin);
      summaryLines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;

      // Alertas
      if (insights.alerts && insights.alerts.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Alertas', margin, yPosition);
        yPosition += 7;
        insights.alerts.forEach((alert, i) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. [${alert.severity.toUpperCase()}] ${alert.title}`, margin, yPosition);
          yPosition += 5;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const alertLines = doc.splitTextToSize(alert.description, pageWidth - 2 * margin - 5);
          alertLines.forEach((line: string) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 3;
        });
        yPosition += 5;
      }

      // Oportunidades
      if (insights.opportunities && insights.opportunities.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Oportunidades', margin, yPosition);
        yPosition += 7;
        insights.opportunities.forEach((opp, i) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. [${opp.impact.toUpperCase()}] ${opp.title}`, margin, yPosition);
          yPosition += 5;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const oppLines = doc.splitTextToSize(opp.description, pageWidth - 2 * margin - 5);
          oppLines.forEach((line: string) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 3;
        });
        yPosition += 5;
      }

      // Recomendações
      if (insights.recommendations && insights.recommendations.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendações', margin, yPosition);
        yPosition += 7;
        insights.recommendations.forEach((rec, i) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          const status = completedActions.has(i) ? '[✓] ' : '[ ] ';
          doc.text(`${status}[${rec.priority.toUpperCase()}] ${rec.action}`, margin, yPosition);
          yPosition += 5;
          if (rec.description) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const recLines = doc.splitTextToSize(rec.description, pageWidth - 2 * margin - 5);
            recLines.forEach((line: string) => {
              if (yPosition > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(line, margin + 5, yPosition);
              yPosition += 5;
            });
          }
          yPosition += 3;
        });
      }

      doc.save(`insights_${analysisType}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const getTimeAgo = () => {
    if (!lastAnalysisTime) return null;
    return formatDistanceToNow(lastAnalysisTime, { addSuffix: true, locale: ptBR });
  };

  const getSeverityColor = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análise Inteligente
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              Insights automáticos baseados nos dados filtrados
              {lastAnalysisTime && (
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  Atualizado {getTimeAgo()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2 flex-1 md:flex-none"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
              {(selectedTeam || selectedRegion || selectedClientType) && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {[selectedTeam, selectedRegion, selectedClientType].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Select value={analysisType} onValueChange={(value) => setAnalysisType(value as AnalysisType)}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(analysisTypeLabels)
                  .filter(([value]) => {
                    // No modo feedbacksOnly, mostrar apenas tipos relevantes a feedbacks
                    if (feedbacksOnly) {
                      return ['feedback_analysis', 'comparative'].includes(value);
                    }
                    // No modo normal, esconder feedback_analysis (é só para página de feedbacks)
                    return value !== 'feedback_analysis';
                  })
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {insights && (
              <Button 
                onClick={exportToPDF} 
                variant="outline" 
                size="sm"
                className="gap-2 flex-1 md:flex-none"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            )}
            <Button 
              onClick={handleGenerate} 
              disabled={loading || (analysisType === 'comparative' && !canGenerateComparative)} 
              variant="outline" 
              size="sm"
              className="flex-1 md:flex-none"
            >
              {loading ? 'Analisando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <CollapsibleContent className="mt-4 space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Segmentar Análise</h4>
              {(selectedTeam || selectedRegion || selectedClientType) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAdvancedFilters}
                  className="h-8 gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Equipe</label>
                <Combobox
                  options={availableTeams?.map(t => ({ value: t.cod_equipe, label: t.nome_equipe })) || []}
                  value={selectedTeam}
                  onValueChange={setSelectedTeam}
                  placeholder="Todas as equipes"
                  searchPlaceholder="Buscar equipe..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Região</label>
                <Combobox
                  options={availableRegions.map(r => ({ value: r, label: r }))}
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                  placeholder="Todas as regiões"
                  searchPlaceholder="Buscar região..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Cliente</label>
                <Select value={selectedClientType} onValueChange={setSelectedClientType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="high_value">Alto Valor (1000+)</SelectItem>
                    <SelectItem value="medium_value">Médio Valor (500-999)</SelectItem>
                    <SelectItem value="low_value">Baixo Valor (&lt;500)</SelectItem>
                    <SelectItem value="new">Novos Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(selectedTeam || selectedRegion || selectedClientType) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Filtros Ativos</AlertTitle>
                <AlertDescription>
                  A análise está sendo segmentada por: {[
                    selectedTeam && `Equipe: ${availableTeams?.find(t => t.cod_equipe === selectedTeam)?.nome_equipe}`,
                    selectedRegion && `Região: ${selectedRegion}`,
                    selectedClientType && selectedClientType !== 'all' && `Tipo: ${selectedClientType}`
                  ].filter(Boolean).join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPIs Contextuais - Esconde visitas quando feedbacksOnly */}
        {contextualKPIs && (
          <div className={`grid gap-3 sm:gap-4 grid-cols-2 ${feedbacksOnly ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
            {!feedbacksOnly && (
              <Card className="border-primary/20">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Visitas</p>
                      <p className="text-xl md:text-2xl font-bold">{contextualKPIs.totalVisits}</p>
                    </div>
                    <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary/60 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-primary/20">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Feedbacks</p>
                    <p className="text-xl md:text-2xl font-bold">{contextualKPIs.totalFeedbacks}</p>
                  </div>
                  <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary/60 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{feedbacksOnly ? 'Supervisores' : 'Gestores Ativos'}</p>
                    <p className="text-xl md:text-2xl font-bold">{contextualKPIs.activeManagers}</p>
                  </div>
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary/60 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Período</p>
                    <p className="text-xl md:text-2xl font-bold">{contextualKPIs.periodDays} dias</p>
                  </div>
                  <Clock className="h-6 w-6 md:h-8 md:w-8 text-primary/60 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        )}

        {!loading && !insights && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma análise gerada ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {analysisType === 'comparative' && (!filters.startDate || !filters.endDate) 
                ? 'Para análise comparativa, selecione um período (data início e fim) nos filtros acima'
                : 'Selecione o tipo de análise e clique em "Atualizar" para começar'
              }
            </p>
          </div>
        )}

        {!loading && insights && (
          <div className="space-y-6">
            {/* Resumo Executivo - Visualização estruturada */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Resumo Executivo
              </h3>
              <InsightsSummaryCard summary={insights.summary} />
            </div>

            {/* Alertas Críticos */}
            {insights.alerts && insights.alerts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Alertas
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {insights.alerts.map((alert, index) => {
                    const isExpanded = expandedAlerts.has(index);
                    return (
                      <Card
                        key={index}
                        className={`transition-colors ${
                          alert.severity === 'critical' ? 'border-destructive' : ''
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <h4 className="font-semibold">{alert.title}</h4>
                                  <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                                    {alert.severity}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleAlertExpand(index)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                {alert.description}
                              </p>
                              {isExpanded && (
                                <div className="mt-3 space-y-2 pt-2 border-t">
                                  {alert.metric && (
                                    <p className="text-xs text-muted-foreground">
                                      <strong>Métrica:</strong> {alert.metric}
                                    </p>
                                  )}
                                  {alert.relatedVendor && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onVendorClick?.(alert.relatedVendor!);
                                      }}
                                    >
                                      Ver vendedor: {alert.relatedVendor}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Oportunidades */}
            {insights.opportunities && insights.opportunities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Oportunidades Identificadas
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {insights.opportunities.map((opportunity, index) => {
                    const isExpanded = expandedOpportunities.has(index);
                    return (
                      <Card
                        key={index}
                        className="transition-colors"
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-semibold">{opportunity.title}</h4>
                                <Badge variant={getImpactColor(opportunity.impact)} className="text-xs">
                                  {opportunity.impact} impact
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleOpportunityExpand(index)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
                              {opportunity.description}
                            </p>
                            {isExpanded && opportunity.clientCode && (
                              <div className="mt-3 pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-2">
                                  <strong>Cliente:</strong> {opportunity.clientCode}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => onOpportunityClick?.(opportunity)}
                                >
                                  Ver detalhes do cliente
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Performers */}
            {insights.topPerformers && insights.topPerformers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Melhores Desempenhos
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {insights.topPerformers.map((performer, index) => (
                        <div key={index}>
                          {index > 0 && <Separator className="my-3" />}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <Button
                                variant="link"
                                className="h-auto p-0 font-semibold"
                                onClick={() => onVendorClick?.(performer.name)}
                              >
                                {performer.name}
                              </Button>
                              <p className="text-sm text-muted-foreground">{performer.reason}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{performer.metric}</p>
                              <p className="font-semibold text-success">{performer.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bottom Performers */}
            {insights.bottomPerformers && insights.bottomPerformers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Áreas de Atenção
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {insights.bottomPerformers.map((performer, index) => (
                        <div key={index}>
                          {index > 0 && <Separator className="my-3" />}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <Button
                                variant="link"
                                className="h-auto p-0 font-semibold"
                                onClick={() => onVendorClick?.(performer.name)}
                              >
                                {performer.name}
                              </Button>
                              <p className="text-sm text-muted-foreground">{performer.reason}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{performer.metric}</p>
                              <p className="font-semibold text-destructive">{performer.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recomendações */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Ações Recomendadas
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {insights.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <Checkbox
                            id={`action-${index}`}
                            checked={completedActions.has(index)}
                            onCheckedChange={() => toggleActionComplete(index)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`action-${index}`}
                              className={`flex items-start gap-2 cursor-pointer ${
                                completedActions.has(index) ? 'line-through opacity-60' : ''
                              }`}
                            >
                              <Badge variant={getPriorityColor(recommendation.priority)} className="mt-0.5">
                                {recommendation.priority}
                              </Badge>
                              <div className="flex-1">
                                <p className="font-medium">{recommendation.action}</p>
                                {recommendation.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {completedActions.size > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground text-center">
                          {completedActions.size} de {insights.recommendations.length} ações concluídas
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
