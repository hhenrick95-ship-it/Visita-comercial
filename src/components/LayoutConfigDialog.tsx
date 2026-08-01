import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GripVertical, Target, BarChart3, Map, List, Table, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface LayoutConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrder: string[];
  onOrderChange: (newOrder: string[]) => void;
}

const componentLabels: Record<string, { label: string; icon: any }> = {
  goals: { label: "Metas Diárias", icon: Target },
  kpis: { label: "Indicadores (KPIs)", icon: BarChart3 },
  visitsByDay: { label: "Visitas por Gestor/Dia", icon: Table },
  ruptures: { label: "Rupturas Identificadas", icon: AlertTriangle },
  opportunities: { label: "Oportunidades Detectadas", icon: Lightbulb },
  charts: { label: "Gráficos", icon: BarChart3 },
  insights: { label: "Análise Inteligente", icon: Target },
  map: { label: "Mapa de Visitas", icon: Map },
  visits: { label: "Lista de Visitas", icon: List },
};

export function LayoutConfigDialog({
  open,
  onOpenChange,
  currentOrder,
  onOrderChange,
}: LayoutConfigDialogProps) {
  const [order, setOrder] = useState<string[]>(currentOrder);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Garantir que todos os componentes disponíveis apareçam
    const allComponents = Object.keys(componentLabels);
    const existingOrder = currentOrder.filter(c => allComponents.includes(c));
    const missingComponents = allComponents.filter(c => !currentOrder.includes(c));
    setOrder([...existingOrder, ...missingComponents]);
  }, [currentOrder]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("dashboard_layout")
        .update({ component_order: order, updated_at: new Date().toISOString() })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      onOrderChange(order);
      toast.success("Layout atualizado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar layout:", error);
      toast.error("Erro ao salvar configuração de layout");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultOrder = ["goals", "kpis", "visitsByDay", "ruptures", "opportunities", "charts", "insights", "map", "visits"];
    setOrder(defaultOrder);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Layout do Dashboard</DialogTitle>
          <DialogDescription>
            Reorganize a ordem dos componentes do dashboard. As alterações serão aplicadas para todos os usuários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {order.map((componentId, index) => {
            const { label, icon: Icon } = componentLabels[componentId];
            return (
              <Card key={componentId} className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveDown(index)}
                      disabled={index === order.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Restaurar Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Layout"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
