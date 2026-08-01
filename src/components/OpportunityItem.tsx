import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Eye, Package, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OpportunityItemProps {
  id: string;
  date: string;
  manager: string;
  client: string;
  hasMix: boolean;
  hasVisibility: boolean;
  mixDetails?: string | null;
  visibilityDetails?: string | null;
  additionalComments?: string | null;
}

export const OpportunityItem = ({
  id,
  date,
  manager,
  client,
  hasMix,
  hasVisibility,
  mixDetails,
  visibilityDetails,
  additionalComments,
}: OpportunityItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const hasDetails = mixDetails || visibilityDetails || additionalComments;

  const fetchAIAnalysis = async () => {
    if (aiAnalysis || loadingAI) return;
    
    setLoadingAI(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Sessão expirada");
        return;
      }

      const context = {
        manager,
        client,
        date,
        opportunities: {
          hasMix,
          hasVisibility,
          mixDetails: mixDetails || "Não informado",
          visibilityDetails: visibilityDetails || "Não informado",
        },
        additionalComments: additionalComments || "Nenhum comentário adicional",
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-opportunity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ context }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
          return;
        }
        if (response.status === 402) {
          toast.error("Créditos de IA esgotados.");
          return;
        }
        throw new Error("Erro ao analisar oportunidade");
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error("Erro ao buscar análise:", error);
      toast.error("Erro ao analisar oportunidade");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    if (newExpanded && !aiAnalysis && hasDetails) {
      fetchAIAnalysis();
    }
  };

  return (
    <div className="border rounded-lg bg-muted/30 overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={handleExpand}
        className="w-full p-3 flex items-start justify-between gap-2 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{manager}</p>
          <p className="text-xs text-muted-foreground">
            Cliente: {client} • {date}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasMix && (
            <Badge variant="secondary" className="text-xs bg-chart-1/20 text-chart-1 border-chart-1/30">
              <Package className="h-3 w-3 mr-1" />
              Mix
            </Badge>
          )}
          {hasVisibility && (
            <Badge variant="secondary" className="text-xs bg-chart-2/20 text-chart-2 border-chart-2/30">
              <Eye className="h-3 w-3 mr-1" />
              Visib.
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 ml-1 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t space-y-3">
          {/* Original Details */}
          <div className="space-y-2 pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Detalhes da Oportunidade
            </h4>
            
            <div className="space-y-2">
              {hasMix && (
                <div className="text-xs p-2 rounded bg-chart-1/10 border border-chart-1/20">
                  <span className="font-medium text-chart-1 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Expansão de Mix
                  </span>
                  {mixDetails && (
                    <p className="text-foreground/80 mt-1">{mixDetails}</p>
                  )}
                </div>
              )}
              
              {hasVisibility && (
                <div className="text-xs p-2 rounded bg-chart-2/10 border border-chart-2/20">
                  <span className="font-medium text-chart-2 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Melhoria de Visibilidade
                  </span>
                  {visibilityDetails && (
                    <p className="text-foreground/80 mt-1">{visibilityDetails}</p>
                  )}
                </div>
              )}
              
              {additionalComments && (
                <div className="text-xs p-2 rounded bg-muted border">
                  <span className="font-medium">Comentários/Observações:</span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{additionalComments}</p>
                </div>
              )}

              {!mixDetails && !visibilityDetails && !additionalComments && (
                <p className="text-xs text-muted-foreground italic p-2">
                  Oportunidade identificada, mas sem detalhes adicionais registrados.
                </p>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          {hasDetails && (
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Análise por IA
              </h4>
              
              {loadingAI ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : aiAnalysis ? (
                <div className="text-xs p-2 rounded bg-primary/5 border border-primary/20 text-foreground/80 whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAIAnalysis}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gerar análise
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
