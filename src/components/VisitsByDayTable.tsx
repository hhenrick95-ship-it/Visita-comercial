// VisitsByDayTable v4 - semáforo por célula com meta individual por gestor
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Table as TableIcon, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeManagerName, TeamMember, getBaseManagerName } from "@/lib/normalizeManager";

interface VisitData {
  id: string;
  visit_date: string;
  manager: string;
}

interface DailyGoalEntry {
  nome_equipe: string;
  meta_diaria: number;
  cod_rca_lopes: string | null;
}

interface VisitsByDayTableProps {
  visits: VisitData[];
  allManagers?: string[];
  dailyGoal?: number;
}

export function VisitsByDayTable({ visits, allManagers = [], dailyGoal = 7 }: VisitsByDayTableProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoalEntry[]>([]);
  const [compactView, setCompactView] = useState(false);

  const BLUE_BG = 'hsl(210, 70%, 45%)';
  const BLUE_DARK = 'hsl(210, 70%, 35%)';
  
  // Get the daily goal for a specific manager (uses individual goals from team_daily_goals)
  const getManagerGoal = (manager: string): number => {
    if (dailyGoals.length === 0) return dailyGoal;
    
    const managerBase = getBaseManagerName(manager).toUpperCase();
    
    // Try exact match on nome_equipe (base, without cargo)
    const match = dailyGoals.find(g => {
      const goalBase = getBaseManagerName(g.nome_equipe).toUpperCase();
      return goalBase === managerBase;
    });
    
    if (match) return match.meta_diaria;
    
    // Try match by team letter prefix
    const teamLetterMatch = manager.match(/EQUIPE\s+(\w)/i);
    if (teamLetterMatch) {
      const letter = teamLetterMatch[1].toUpperCase();
      const prefixMatch = dailyGoals.find(g => {
        const gLetter = g.nome_equipe.match(/EQUIPE\s+(\w)/i)?.[1]?.toUpperCase();
        return gLetter === letter;
      });
      if (prefixMatch) return prefixMatch.meta_diaria;
    }
    
    return dailyGoal;
  };

  // Get cell color based on count vs individual daily goal (only for count > 0)
  const getCellColor = (count: number, goal: number) => {
    if (count === 0) return BLUE_BG;
    if (count >= goal) return 'hsl(130, 60%, 40%)';
    if (count >= goal * 0.5) return 'hsl(45, 80%, 45%)';
    return 'hsl(0, 70%, 45%)';
  };

  // Load team members and daily goals
  useEffect(() => {
    const loadData = async () => {
      const [teamRes, goalsRes] = await Promise.all([
        supabase
          .from("teams_vendors")
          .select("cod_rca_lopes, nome_rca, nome_equipe, cargo")
          .or("cargo.eq.coordenador,cargo.eq.gerente,cargo.eq.supervisor"),
        supabase
          .from("team_daily_goals")
          .select("nome_equipe, meta_diaria, cod_rca_lopes")
      ]);
      
      setTeamMembers(teamRes.data || []);
      setDailyGoals(goalsRes.data || []);
    };
    loadData();
  }, []);

  // Use centralized normalizeManagerName for consistent grouping
  const normalizeManagerKey = (manager: string): string => {
    return normalizeManagerName(manager, teamMembers);
  };

  // Helper function to format manager name for display
  const formatManagerName = (manager: string): string => {
    // Already normalized, just return
    return manager;
  };

  // Helper function to get day abbreviation
  const getDayAbbreviation = (date: Date): string => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  // Helper function to get month name
  const getMonthName = (month: number): string => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return months[month - 1];
  };

  // Helper function to get week of month
  const getWeekOfMonth = (date: Date): number => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
  };

  const { managers, days, matrix, rowTotals, columnTotals, grandTotal, daysInfo, weeksData, monthName, year, month } = useMemo(() => {
    // Normalize all managers from visits for consistent grouping
    const normalizedVisits = visits.map(v => ({
      ...v,
      normalizedManager: normalizeManagerKey(v.manager)
    }));

    // Get managers from props or from visits (normalized)
    const managersFromVisits = new Set(normalizedVisits.map(v => v.normalizedManager));
    const normalizedAllManagers = allManagers.map(m => normalizeManagerKey(m));
    const managersSet = allManagers.length > 0 
      ? new Set([...normalizedAllManagers]) 
      : managersFromVisits;
    const managers = Array.from(managersSet).sort();

    // Get the month/year from visits to determine days in month
    let daysInMonth = 31; // default
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    
    if (visits.length > 0) {
      const firstVisitDate = visits[0].visit_date;
      [year, month] = firstVisitDate.split('-').map(Number);
      // Get the last day of the month
      daysInMonth = new Date(year, month, 0).getDate();
    }
    
    // Always show all days of the month (1 to daysInMonth)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Calculate days info with abbreviation and week
    const daysInfo = days.map(day => {
      const date = new Date(year, month - 1, day);
      return {
        day,
        abbreviation: getDayAbbreviation(date),
        week: getWeekOfMonth(date)
      };
    });

    // Group days by week for colspan calculation
    const weeksData: { week: string; count: number }[] = [];
    let currentWeek = 0;
    
    daysInfo.forEach(dayInfo => {
      if (dayInfo.week !== currentWeek) {
        currentWeek = dayInfo.week;
        weeksData.push({ week: `S${dayInfo.week}`, count: 1 });
      } else {
        weeksData[weeksData.length - 1].count++;
      }
    });

    const monthName = getMonthName(month);

    // Create matrix: manager -> day -> count
    const matrix: Record<string, Record<number, number>> = {};
    const rowTotals: Record<string, number> = {};
    const columnTotals: Record<number, number> = {};

    managers.forEach(m => {
      matrix[m] = {};
      rowTotals[m] = 0;
      days.forEach(d => {
        matrix[m][d] = 0;
      });
    });

    days.forEach(d => {
      columnTotals[d] = 0;
    });

    // Fill matrix with counts using normalized manager names
    normalizedVisits.forEach(v => {
      const day = parseInt(v.visit_date.split('-')[2], 10);
      if (matrix[v.normalizedManager] && days.includes(day)) {
        matrix[v.normalizedManager][day]++;
        rowTotals[v.normalizedManager]++;
        columnTotals[day]++;
      }
    });

    const grandTotal = Object.values(rowTotals).reduce((sum, val) => sum + val, 0);

    return { managers, days, matrix, rowTotals, columnTotals, grandTotal, daysInfo, weeksData, monthName, year, month };
  }, [visits, allManagers, teamMembers]);

  // Apply compact view filter
  const filteredData = useMemo(() => {
    if (!compactView) {
      return { filteredManagers: managers, filteredDays: days, filteredDaysInfo: daysInfo, filteredWeeksData: weeksData };
    }

    // Filter days with at least one visit
    const filteredDays = days.filter(day => columnTotals[day] > 0);
    
    // Filter managers with at least one visit
    const filteredManagers = managers.filter(manager => rowTotals[manager] > 0);
    
    // Filter daysInfo for filtered days
    const filteredDaysInfo = daysInfo.filter(d => columnTotals[d.day] > 0);
    
    // Recalculate weeks data for filtered days
    const filteredWeeksData: { week: string; count: number }[] = [];
    let currentWeek = 0;
    
    filteredDaysInfo.forEach(dayInfo => {
      if (dayInfo.week !== currentWeek) {
        currentWeek = dayInfo.week;
        filteredWeeksData.push({ week: `S${dayInfo.week}`, count: 1 });
      } else {
        filteredWeeksData[filteredWeeksData.length - 1].count++;
      }
    });

    return { filteredManagers, filteredDays, filteredDaysInfo, filteredWeeksData };
  }, [compactView, managers, days, daysInfo, weeksData, columnTotals, rowTotals]);

  const { filteredManagers, filteredDays, filteredDaysInfo, filteredWeeksData } = filteredData;

  if (visits.length === 0 && allManagers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Visitas por Gestor/Dia
          </CardTitle>
          <CardDescription>Matriz de visitas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma visita encontrada no período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="h-5 w-5" />
          Visitas por Gestor/Dia
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCompactView(!compactView)}
            title={compactView ? "Expandir visualização" : "Compactar visualização"}
            className="ml-2 h-7 w-7 p-0"
          >
            {compactView ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </CardTitle>
        <CardDescription>
          {compactView 
            ? "Exibindo apenas dias e gestores com visitas" 
            : "Matriz de visitas realizadas por supervisor e dia"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                {/* Row 1: GESTOR | MÊS | Total */}
                <tr className="bg-[hsl(210,70%,40%)]">
                  <th 
                    rowSpan={4} 
                    className="sticky left-0 z-10 bg-[hsl(210,70%,40%)] px-2 py-1.5 text-left font-semibold text-white border-r border-white/20 min-w-[120px] align-middle"
                  >
                    GESTOR
                  </th>
                  <th 
                    colSpan={filteredDays.length} 
                    className="px-2 py-1.5 text-center font-bold text-white border-r border-white/20 text-sm"
                  >
                    {monthName}
                  </th>
                  <th 
                    rowSpan={4} 
                    className="px-2 py-1.5 text-center font-semibold text-white min-w-[40px] bg-[hsl(210,70%,35%)] align-middle"
                  >
                    Total
                  </th>
                </tr>
                {/* Row 2: Weeks (S1, S2, S3...) */}
                <tr className="bg-[hsl(210,70%,45%)]">
                  {filteredWeeksData.map((weekInfo, index) => (
                    <th 
                      key={index} 
                      colSpan={weekInfo.count} 
                      className="px-1 py-1 text-center font-semibold text-white border-r border-white/20"
                    >
                      {weekInfo.week}
                    </th>
                  ))}
                </tr>
                {/* Row 3: Day abbreviations (Seg, Ter, Qua...) */}
                <tr className="bg-[hsl(210,70%,50%)]">
                  {filteredDaysInfo.map(d => {
                    const isWeekend = d.abbreviation === 'Sáb' || d.abbreviation === 'Dom';
                    return (
                      <th 
                        key={d.day} 
                        className={`px-1 py-1 text-center font-medium text-white min-w-[24px] border-r border-white/20 text-[10px] ${
                          isWeekend ? 'bg-[hsl(25,80%,50%)]' : ''
                        }`}
                      >
                        {d.abbreviation}
                      </th>
                    );
                  })}
                </tr>
                {/* Row 4: Day numbers (1, 2, 3...) */}
                <tr className="bg-[hsl(210,70%,52%)]">
                  {filteredDaysInfo.map(d => {
                    const isWeekend = d.abbreviation === 'Sáb' || d.abbreviation === 'Dom';
                    return (
                      <th 
                        key={d.day} 
                        className={`px-1 py-1 text-center font-semibold text-white min-w-[24px] border-r border-white/20 ${
                          isWeekend ? 'bg-[hsl(25,80%,45%)]' : ''
                        }`}
                      >
                        {d.day}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((manager) => {
                  const displayName = formatManagerName(manager);
                  const managerGoal = getManagerGoal(manager);
                  return (
                  <tr key={manager}>
                    <td 
                      className="sticky left-0 z-10 px-2 py-1 font-medium text-white border-r border-white/20 border-b border-white/10 truncate max-w-[160px]"
                      style={{ backgroundColor: BLUE_BG }}
                      title={displayName}
                    >
                      {displayName}
                    </td>
                    {filteredDays.map(day => {
                      const count = matrix[manager][day];
                      const cellColor = getCellColor(count, managerGoal);
                      return (
                        <td 
                          key={day} 
                          className={`px-1 py-1 text-center border-r border-white/20 border-b border-white/10 text-white ${
                            count > 0 ? 'font-semibold' : ''
                          }`}
                          style={{ backgroundColor: cellColor }}
                        >
                          {count}
                        </td>
                      );
                    })}
                    <td 
                      className="px-2 py-1 text-center font-bold text-white border-b border-white/10"
                      style={{ backgroundColor: BLUE_BG }}
                    >
                      {rowTotals[manager]}
                    </td>
                  </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ backgroundColor: BLUE_DARK }}>
                  <td className="sticky left-0 z-10 px-2 py-1.5 font-bold text-white border-r border-white/20" style={{ backgroundColor: BLUE_DARK }}>
                    Total
                  </td>
                  {filteredDays.map(day => (
                    <td key={day} className="px-1 py-1.5 text-center font-semibold text-white border-r border-white/20">
                      {columnTotals[day]}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center font-bold text-white" style={{ backgroundColor: 'hsl(210, 70%, 28%)' }}>
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
