import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Package, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface RuptureData {
  id: string;
  description: string;
  clientCode: string;
  vendor: string;
  manager: string;
  date: string;
}

interface RupturesPanelProps {
  ruptures: RuptureData[];
  loading?: boolean;
  onItemClick?: (item: RuptureData) => void;
  selectedItemId?: string | null;
}

export function RupturesPanel({ 
  ruptures, 
  loading = false,
  onItemClick,
  selectedItemId
}: RupturesPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const displayLimit = 10;
  const displayedRuptures = showAll ? ruptures : ruptures.slice(0, displayLimit);
  const hasMore = ruptures.length > displayLimit;

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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Rupturas Identificadas
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Rupturas Identificadas
          </CardTitle>
          {hasSelection && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Selecionado
            </Badge>
          )}
        </div>
        <CardDescription>
          Produtos com ruptura identificados em campo ({ruptures.length} registros)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ruptures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma ruptura identificada no período</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {displayedRuptures.map((rupture) => {
                  const isExpanded = expandedItems.has(rupture.id);
                  const isSelected = selectedItemId === rupture.id;
                  const description = rupture.description || "Ruptura não especificada";
                  const isLongDescription = description.length > 80;
                  
                  return (
                    <div
                      key={rupture.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onItemClick?.(rupture)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onItemClick?.(rupture);
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Ruptura
                              </Badge>
                            </div>
                            <p className={`text-sm font-medium ${!isExpanded && isLongDescription ? 'line-clamp-2' : ''}`}>
                              {description}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span>
                                Cliente: <span className="font-medium text-foreground">{rupture.clientCode}</span>
                              </span>
                              <span>
                                Vendedor: <span className="font-medium text-foreground">{rupture.vendor}</span>
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rupture.manager} • {formatDate(rupture.date)}
                            </p>
                          </div>
                          {isLongDescription && (
                            <button
                              onClick={(e) => toggleExpanded(rupture.id, e)}
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
                      Ver todas ({ruptures.length - displayLimit} mais)
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
