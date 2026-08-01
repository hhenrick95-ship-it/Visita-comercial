import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Eye, Package, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface OpportunityData {
  id: string;
  type: 'mix' | 'visibility' | 'both';
  mixDetails?: string | null;
  visibilityDetails?: string | null;
  clientCode: string;
  vendor: string;
  manager: string;
  date: string;
}

interface OpportunitiesPanelProps {
  opportunities: OpportunityData[];
  loading?: boolean;
  onItemClick?: (item: OpportunityData) => void;
  selectedItemId?: string | null;
}

type FilterType = 'all' | 'mix' | 'visibility';

export function OpportunitiesPanel({ 
  opportunities, 
  loading = false,
  onItemClick,
  selectedItemId
}: OpportunitiesPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<FilterType>('all');

  const displayLimit = 10;

  // Filter by type
  const filteredOpportunities = filterType === 'all'
    ? opportunities
    : opportunities.filter(o => {
        if (filterType === 'mix') return o.type === 'mix' || o.type === 'both';
        if (filterType === 'visibility') return o.type === 'visibility' || o.type === 'both';
        return true;
      });

  const displayedOpportunities = showAll ? filteredOpportunities : filteredOpportunities.slice(0, displayLimit);
  const hasMore = filteredOpportunities.length > displayLimit;

  // Count by type
  const mixCount = opportunities.filter(o => o.type === 'mix' || o.type === 'both').length;
  const visibilityCount = opportunities.filter(o => o.type === 'visibility' || o.type === 'both').length;

  const toggleExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Oportunidades Detectadas
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if there's any selected item
  const hasSelection = selectedItemId !== null;

  return (
    <Card className={cn(hasSelection && "ring-1 ring-primary/20")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Oportunidades Detectadas
          </CardTitle>
          {hasSelection && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Selecionado
            </Badge>
          )}
        </div>
        <CardDescription>
          Expansão de mix e melhorias de visibilidade ({opportunities.length} registros)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma oportunidade identificada no período</p>
            <p className="text-xs mt-1">Tente expandir o filtro de datas ou remover filtros ativos.</p>
          </div>
        ) : (
          <>
            {/* Filter buttons */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="text-xs h-7"
              >
                <Filter className="h-3 w-3 mr-1" />
                Todas ({opportunities.length})
              </Button>
              <Button
                variant={filterType === 'mix' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('mix')}
                className="text-xs h-7"
              >
                <Package className="h-3 w-3 mr-1" />
                Mix ({mixCount})
              </Button>
              <Button
                variant={filterType === 'visibility' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('visibility')}
                className="text-xs h-7"
              >
                <Eye className="h-3 w-3 mr-1" />
                Visibilidade ({visibilityCount})
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {displayedOpportunities.map((opportunity) => {
                  const isExpanded = expandedItems.has(opportunity.id);
                  const isSelected = selectedItemId === opportunity.id;
                  const hasDetails = opportunity.mixDetails || opportunity.visibilityDetails;
                  
                  return (
                    <div
                      key={opportunity.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onItemClick?.(opportunity)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onItemClick?.(opportunity);
                        }
                      }}
                      className={cn(
                        "border rounded-lg bg-muted/30 overflow-hidden cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm",
                        isSelected && "ring-2 ring-primary bg-primary/10 border-primary/30 shadow-md"
                      )}
                    >
                      <div className="w-full p-3 text-left relative">
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                              Ativo
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2 pr-10">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {(opportunity.type === 'mix' || opportunity.type === 'both') && (
                                <Badge variant="secondary" className="text-xs bg-chart-1/20 text-chart-1 border-chart-1/30">
                                  <Package className="h-3 w-3 mr-1" />
                                  Mix
                                </Badge>
                              )}
                              {(opportunity.type === 'visibility' || opportunity.type === 'both') && (
                                <Badge variant="secondary" className="text-xs bg-chart-2/20 text-chart-2 border-chart-2/30">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visibilidade
                                </Badge>
                              )}
                            </div>
                            
                            {/* Show details summary if not expanded */}
                            {hasDetails && !isExpanded && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {opportunity.mixDetails || opportunity.visibilityDetails}
                              </p>
                            )}
                            
                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="space-y-2 mt-2">
                                {opportunity.mixDetails && (
                                  <div className="text-xs p-2 rounded bg-chart-1/10 border border-chart-1/20">
                                    <span className="font-medium text-chart-1">Expansão de Mix:</span>
                                    <p className="text-foreground/80 mt-0.5">{opportunity.mixDetails}</p>
                                  </div>
                                )}
                                {opportunity.visibilityDetails && (
                                  <div className="text-xs p-2 rounded bg-chart-2/10 border border-chart-2/20">
                                    <span className="font-medium text-chart-2">Melhoria de Visibilidade:</span>
                                    <p className="text-foreground/80 mt-0.5">{opportunity.visibilityDetails}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span>
                                Cliente: <span className="font-medium text-foreground">{opportunity.clientCode}</span>
                              </span>
                              <span>
                                Vendedor: <span className="font-medium text-foreground">{opportunity.vendor}</span>
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {opportunity.manager} • {formatDate(opportunity.date)}
                            </p>
                          </div>
                          {hasDetails && (
                            <button
                              onClick={(e) => toggleExpanded(opportunity.id, e)}
                              className="flex-shrink-0 p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {hasMore && (
              <div className="mt-3 pt-3 border-t text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Ver todas ({filteredOpportunities.length - displayLimit} mais)
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
