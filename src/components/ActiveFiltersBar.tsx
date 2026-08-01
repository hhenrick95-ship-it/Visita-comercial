import { X, FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface ActiveFiltersBarProps {
  filters: ActiveFilter[];
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersBar({ filters, onClearAll, className }: ActiveFiltersBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border", className)}>
      <span className="text-sm font-medium text-muted-foreground mr-1">Filtros ativos:</span>
      
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="pl-3 pr-1 py-1.5 gap-1 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span className="text-xs font-medium">{filter.label}:</span>
          <span className="text-xs max-w-[150px] truncate">{filter.value}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              filter.onRemove();
            }}
            className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
            aria-label={`Remover filtro ${filter.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <FilterX className="h-3 w-3 mr-1" />
        Limpar Todos
      </Button>
    </div>
  );
}
