import * as React from "react";
import { ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { Checkbox } from "./checkbox";
import { cn } from "@/lib/utils";

interface DateTreeFilterProps {
  availableDates: string[];
  selectedYears: string[];
  selectedMonths: string[];
  onSelectionChange: (years: string[], months: string[]) => void;
  className?: string;
}

const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"
];

export function DateTreeFilter({
  availableDates,
  selectedYears,
  selectedMonths,
  onSelectionChange,
  className,
}: DateTreeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [expandedYears, setExpandedYears] = React.useState<string[]>([]);

  // Group dates by year and month with counts
  const dateStructure = React.useMemo(() => {
    const structure: Record<string, Record<string, number>> = {};
    
    availableDates.forEach(date => {
      const [year, month] = date.split('-');
      if (!structure[year]) {
        structure[year] = {};
      }
      const yearMonth = `${year}-${month}`;
      structure[year][yearMonth] = (structure[year][yearMonth] || 0) + 1;
    });

    // Sort years descending
    const sortedYears = Object.keys(structure).sort((a, b) => parseInt(b) - parseInt(a));
    
    return sortedYears.map(year => ({
      year,
      months: Object.entries(structure[year])
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([yearMonth, count]) => ({
          yearMonth,
          monthIndex: parseInt(yearMonth.split('-')[1]) - 1,
          count,
        })),
      totalCount: Object.values(structure[year]).reduce((sum, c) => sum + c, 0),
    }));
  }, [availableDates]);

  const toggleYearExpanded = (year: string) => {
    setExpandedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const handleYearToggle = (year: string, yearMonths: string[]) => {
    const isYearSelected = selectedYears.includes(year);
    
    if (isYearSelected) {
      // Deselect year and all its months
      onSelectionChange(
        selectedYears.filter(y => y !== year),
        selectedMonths.filter(m => !m.startsWith(year))
      );
    } else {
      // Select year and all its months
      onSelectionChange(
        [...selectedYears, year],
        [...selectedMonths.filter(m => !m.startsWith(year)), ...yearMonths]
      );
    }
  };

  const handleMonthToggle = (year: string, yearMonth: string, allYearMonths: string[]) => {
    const isMonthSelected = selectedMonths.includes(yearMonth);
    
    let newSelectedMonths: string[];
    if (isMonthSelected) {
      newSelectedMonths = selectedMonths.filter(m => m !== yearMonth);
    } else {
      newSelectedMonths = [...selectedMonths, yearMonth];
    }

    // Check if all months of the year are now selected
    const yearMonthsSelected = newSelectedMonths.filter(m => m.startsWith(year));
    const allMonthsSelected = allYearMonths.every(m => yearMonthsSelected.includes(m));
    const noMonthsSelected = yearMonthsSelected.length === 0;

    let newSelectedYears = [...selectedYears];
    if (allMonthsSelected && !newSelectedYears.includes(year)) {
      newSelectedYears.push(year);
    } else if (noMonthsSelected) {
      newSelectedYears = newSelectedYears.filter(y => y !== year);
    }

    onSelectionChange(newSelectedYears, newSelectedMonths);
  };

  const getYearCheckState = (year: string, yearMonths: string[]): "checked" | "unchecked" | "indeterminate" => {
    const selectedCount = yearMonths.filter(m => selectedMonths.includes(m)).length;
    if (selectedCount === 0) return "unchecked";
    if (selectedCount === yearMonths.length) return "checked";
    return "indeterminate";
  };

  const hasSelections = selectedYears.length > 0 || selectedMonths.length > 0;

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-card", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium text-sm">DATA</span>
            {hasSelections && (
              <span className="text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                {selectedMonths.length || selectedYears.length}
              </span>
            )}
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-2 text-xs text-muted-foreground border-b">
            Seleções múltiplas
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {dateStructure.map(({ year, months, totalCount }) => {
              const yearMonths = months.map(m => m.yearMonth);
              const checkState = getYearCheckState(year, yearMonths);
              const isExpanded = expandedYears.includes(year);

              return (
                <div key={year} className="border-b last:border-b-0">
                  <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => toggleYearExpanded(year)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    
                    <Checkbox
                      checked={checkState === "checked"}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = checkState === "indeterminate";
                        }
                      }}
                      onCheckedChange={() => handleYearToggle(year, yearMonths)}
                      className="h-4 w-4"
                    />
                    
                    <span className="text-sm font-medium flex-1">{year}</span>
                    <span className="text-xs text-muted-foreground">({totalCount})</span>
                  </div>

                  {isExpanded && (
                    <div className="pl-8 pb-1">
                      {months.map(({ yearMonth, monthIndex, count }) => (
                        <div
                          key={yearMonth}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded"
                        >
                          <Checkbox
                            checked={selectedMonths.includes(yearMonth)}
                            onCheckedChange={() => handleMonthToggle(year, yearMonth, yearMonths)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-sm">{MONTH_NAMES[monthIndex]}</span>
                          <span className="text-xs text-muted-foreground">({count})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {dateStructure.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Nenhuma data disponível
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
