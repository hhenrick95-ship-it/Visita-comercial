import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Scale, AlertTriangle, ChevronRight } from "lucide-react";
import {
  normalizeManagerName,
  buildManagerName,
  getShortManagerName,
  extractCleanName,
  type TeamMember,
} from "@/lib/normalizeManager";

export interface SupervisorOption {
  id: string;
  cod_rca_lopes: string;
  nome_rca: string | null;
  nome_equipe: string;
  cargo: string;
}

export interface RcaRosterMember {
  id: string;
  cod_rca_lopes: string;
  nome_rca: string | null;
  nome_equipe: string;
  supervisor_id: string | null;
}

interface VisitLite {
  manager: string;
  rca_accompanied: string;
}

interface VisitsByRcaPanelProps {
  visits: VisitLite[];
  supervisors: SupervisorOption[];
  rcaRoster: RcaRosterMember[];
  selectedManagers: string[];
  onSelectManager: (managerFullName: string) => void;
}

interface RcaRow {
  rcaId: string;
  label: string;
  count: number;
}

interface SupervisorStat {
  fullName: string;
  shortName: string;
  total: number;
  rows: RcaRow[];
  max: number;
  min: number;
  zeroCount: number;
  imbalanced: boolean;
  rosterSize: number;
}

const getShortRcaName = (nomeRca: string): string => {
  const clean = extractCleanName(nomeRca);
  return clean || nomeRca;
};

export function VisitsByRcaPanel({
  visits,
  supervisors,
  rcaRoster,
  selectedManagers,
  onSelectManager,
}: VisitsByRcaPanelProps) {
  const teamMembersForNorm: TeamMember[] = useMemo(
    () =>
      supervisors.map((s) => ({
        cod_rca_lopes: s.cod_rca_lopes,
        nome_rca: s.nome_rca,
        nome_equipe: s.nome_equipe,
        cargo: s.cargo,
      })),
    [supervisors]
  );

  const rosterBySupervisorId = useMemo(() => {
    const map = new Map<string, RcaRosterMember[]>();
    for (const r of rcaRoster) {
      if (!r.supervisor_id) continue;
      const arr = map.get(r.supervisor_id) || [];
      arr.push(r);
      map.set(r.supervisor_id, arr);
    }
    return map;
  }, [rcaRoster]);

  // managerFullName -> (rca nome_rca -> contagem)
  const visitCounts = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const v of visits) {
      const managerFull = normalizeManagerName(v.manager, teamMembersForNorm);
      const rcaKey = (v.rca_accompanied || "").trim();
      if (!managerFull || !rcaKey) continue;
      let inner = map.get(managerFull);
      if (!inner) {
        inner = new Map();
        map.set(managerFull, inner);
      }
      inner.set(rcaKey, (inner.get(rcaKey) || 0) + 1);
    }
    return map;
  }, [visits, teamMembersForNorm]);

  const supervisorStats = useMemo<SupervisorStat[]>(() => {
    return supervisors
      .map((sup) => {
        const fullName = buildManagerName(sup);
        const roster = rosterBySupervisorId.get(sup.id) || [];
        const counts = visitCounts.get(fullName) || new Map<string, number>();

        const rows: RcaRow[] = roster
          .map((r) => {
            const key = (r.nome_rca || "").trim();
            return {
              rcaId: r.id,
              label: getShortRcaName(r.nome_rca || r.cod_rca_lopes),
              count: counts.get(key) || 0,
            };
          })
          .sort((a, b) => b.count - a.count);

        const total = rows.reduce((s, r) => s + r.count, 0);
        const max = rows.length ? rows[0].count : 0;
        const min = rows.length ? Math.min(...rows.map((r) => r.count)) : 0;
        const zeroCount = rows.filter((r) => r.count === 0).length;
        const imbalanced = rows.length >= 2 && max > 0 && (min === 0 || min / max < 0.34);

        return {
          fullName,
          shortName: getShortManagerName(fullName),
          total,
          rows,
          max,
          min,
          zeroCount,
          imbalanced,
          rosterSize: rows.length,
        };
      })
      .filter((s) => s.rosterSize > 0)
      .sort((a, b) => (Number(b.imbalanced) - Number(a.imbalanced)) || b.total - a.total);
  }, [supervisors, rosterBySupervisorId, visitCounts]);

  const focusedStat =
    selectedManagers.length === 1
      ? supervisorStats.find((s) => s.fullName === selectedManagers[0])
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Atenção por RCA
        </CardTitle>
        <CardDescription>
          {focusedStat
            ? `Visitas de ${focusedStat.shortName} distribuídas entre os RCAs da equipe`
            : "Compare a distribuição de visitas entre os RCAs de cada supervisor/coordenador"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {supervisorStats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Nenhum RCA vinculado a supervisor/coordenador encontrado.
          </p>
        ) : focusedStat ? (
          <div className="space-y-3">
            {focusedStat.imbalanced && (
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Cobertura desigual: pelo menos um RCA está recebendo bem menos atenção que os
                demais.
              </div>
            )}
            {focusedStat.rows.map((row) => {
              const isZero = row.count === 0;
              const isLow = !isZero && focusedStat.max > 0 && row.count / focusedStat.max < 0.34;
              const isTop = row.count === focusedStat.max && row.count > 0;
              const barColor = isZero || isLow ? "[&>div]:bg-red-500" : isTop ? "[&>div]:bg-emerald-500" : "";
              return (
                <div key={row.rcaId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{row.label}</span>
                    <span
                      className={
                        isZero || isLow
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {row.count} {row.count === 1 ? "visita" : "visitas"}
                    </span>
                  </div>
                  <Progress
                    value={focusedStat.max > 0 ? (row.count / focusedStat.max) * 100 : 0}
                    className={`h-2 ${barColor}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {supervisorStats.map((s) => (
              <div
                key={s.fullName}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                  s.imbalanced
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    : "bg-muted/30 border-transparent"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{s.shortName}</span>
                    {s.imbalanced && (
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        Atenção desigual
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.total} visitas no período · {s.rosterSize} RCA{s.rosterSize > 1 ? "s" : ""}
                    {s.zeroCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {" "}
                        · {s.zeroCount} sem nenhuma visita
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onSelectManager(s.fullName)}
                >
                  Ver por RCA
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
