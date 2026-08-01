import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPinOff, Download, Eye, AlertTriangle, Ban, HelpCircle, History, Filter } from "lucide-react";
import { toast } from "sonner";
import { VisitDetailsDialog } from "@/components/VisitDetailsDialog";
import { DashboardFilters } from "@/components/DashboardFilters";
import { useVisitFilters } from "@/hooks/useVisitFilters";
import { getShortManagerName } from "@/lib/normalizeManager";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

interface VisitRow {
  id: string;
  visit_date: string;
  manager: string;
  rca_accompanied: string;
  client_code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geolocation_status: string | null;
  geolocation_error: string | null;
  created_at: string | null;
}

type StatusKey = "denied" | "unavailable" | "error" | "historical";

function getStatusKey(v: VisitRow): StatusKey {
  if (v.geolocation_status === "denied") return "denied";
  if (v.geolocation_status === "unavailable") return "unavailable";
  if (v.geolocation_status === "error") return "error";
  return "historical";
}

const STATUS_CONFIG: Record<StatusKey, { label: string; icon: any; className: string }> = {
  denied: {
    label: "Negado",
    icon: Ban,
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  error: {
    label: "Erro/Timeout",
    icon: AlertTriangle,
    className: "bg-accent text-accent-foreground border-border",
  },
  unavailable: {
    label: "Indisponível",
    icon: HelpCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
  historical: {
    label: "Histórico",
    icon: History,
    className: "bg-secondary text-secondary-foreground border-border",
  },
};

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function SemLocalizacao() {
  const [allVisits, setAllVisits] = useState<VisitRow[]>([]);
  const [missingVisits, setMissingVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [totalVisits, setTotalVisits] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: all, error } = await supabase.rpc("get_all_visits_for_dashboard");
      if (error) throw error;
      const list = (all || []) as VisitRow[];
      setAllVisits(list);
      setTotalVisits(list.length);
      setMissingVisits(
        list.filter((v) => v.latitude == null || v.longitude == null)
      );
    } catch (err: any) {
      toast.error("Erro ao carregar dados", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const {
    filteredVisits,
    filters,
    setSelectedYears,
    setSelectedMonths,
    setFilterClient,
    setFilterVendor,
    setFilterAddress,
    setFilterManagers,
    handleDateSelectionChange,
    clearFilters,
    availableOptions,
    hasActiveFilters,
  } = useVisitFilters<VisitRow>({
    visits: missingVisits,
    getVisitDate: (v) => v.visit_date,
    getClientCode: (v) => v.client_code,
    getVendor: (v) => v.rca_accompanied,
    getAddress: (v) => v.address,
    getManager: (v) => v.manager,
  });

  // KPIs
  const totalMissing = missingVisits.length;
  const filteredCount = filteredVisits.length;
  const percentage = totalVisits > 0 ? ((totalMissing / totalVisits) * 100).toFixed(1) : "0";

  const statusCounts = useMemo(() => {
    const c: Record<StatusKey, number> = { denied: 0, error: 0, unavailable: 0, historical: 0 };
    filteredVisits.forEach((v) => {
      c[getStatusKey(v)]++;
    });
    return c;
  }, [filteredVisits]);

  // Ranking por gestor (sobre todas as visitas para % correto)
  const managerRanking = useMemo(() => {
    const totalsByManager: Record<string, number> = {};
    allVisits.forEach((v) => {
      totalsByManager[v.manager] = (totalsByManager[v.manager] || 0) + 1;
    });
    const missingByManager: Record<string, number> = {};
    filteredVisits.forEach((v) => {
      missingByManager[v.manager] = (missingByManager[v.manager] || 0) + 1;
    });
    return Object.entries(missingByManager)
      .map(([manager, count]) => ({
        manager,
        count,
        total: totalsByManager[manager] || count,
        pct: totalsByManager[manager] ? (count / totalsByManager[manager]) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredVisits, allVisits]);

  // Ranking EXCLUSIVO de gestores que NEGARAM permissão (denied)
  const deniedRanking = useMemo(() => {
    const totalsByManager: Record<string, number> = {};
    allVisits.forEach((v) => {
      totalsByManager[v.manager] = (totalsByManager[v.manager] || 0) + 1;
    });
    const deniedByManager: Record<string, number> = {};
    filteredVisits
      .filter((v) => getStatusKey(v) === "denied")
      .forEach((v) => {
        deniedByManager[v.manager] = (deniedByManager[v.manager] || 0) + 1;
      });
    return Object.entries(deniedByManager)
      .map(([manager, count]) => ({
        manager,
        count,
        total: totalsByManager[manager] || count,
        pct: totalsByManager[manager] ? (count / totalsByManager[manager]) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredVisits, allVisits]);

  const handleExportCSV = () => {
    const headers = [
      "Data",
      "Gestor",
      "Vendedor",
      "Cliente",
      "Motivo",
      "Mensagem",
      "Endereço",
    ];
    const rows = filteredVisits.map((v) => {
      const key = getStatusKey(v);
      return [
        formatDateOnlyPtBR(v.visit_date),
        v.manager,
        v.rca_accompanied,
        v.client_code,
        STATUS_CONFIG[key].label,
        v.geolocation_error || "",
        v.address || "",
      ].map(escapeCSV);
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `visitas_sem_gps_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={MapPinOff}
          title="Visitas Sem Localização"
          description="Auditoria de visitas registradas sem captura de GPS"
          actions={
            <Button onClick={handleExportCSV} variant="outline" disabled={filteredCount === 0} className="glass-card border-0">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV ({filteredCount})
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total sem GPS</CardDescription>
              <CardTitle className="text-3xl">{totalMissing}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {percentage}% de {totalVisits} visitas
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Ban className="h-3 w-3 text-destructive" /> Negado
              </CardDescription>
              <CardTitle className="text-3xl text-destructive">{statusCounts.denied}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Permissão recusada
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Erro
              </CardDescription>
              <CardTitle className="text-3xl">{statusCounts.error + statusCounts.unavailable}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Falha técnica/timeout
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <History className="h-3 w-3" /> Histórico
              </CardDescription>
              <CardTitle className="text-3xl">{statusCounts.historical}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Antes do rastreamento
            </CardContent>
          </Card>
        </div>

        {/* Filtros + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gestores que NEGARAM acesso - destaque */}
          <Card className="lg:col-span-3 border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Ban className="h-5 w-5" />
                Gestores que NEGARAM acesso à localização
              </CardTitle>
              <CardDescription>
                Lista de pessoas que recusaram explicitamente a permissão de GPS no dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deniedRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  ✓ Nenhum gestor negou acesso no período/filtro selecionado.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deniedRanking.map((m, idx) => (
                    <div
                      key={m.manager}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-destructive/30 bg-card"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-bold text-destructive">#{idx + 1}</span>
                        <span className="truncate font-medium text-sm" title={m.manager}>
                          {getShortManagerName(m.manager)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="text-xs">
                          {m.count} {m.count === 1 ? "negação" : "negações"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {m.pct.toFixed(0)}% das visitas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <DashboardFilters
              filters={filters}
              availableClients={availableOptions.clients}
              availableVendors={availableOptions.vendors}
              availableManagers={availableOptions.managers}
              availableDates={availableOptions.dates}
              onClientChange={setFilterClient}
              onVendorChange={setFilterVendor}
              onAddressChange={setFilterAddress}
              onManagerChange={setFilterManagers}
              onDateSelectionChange={handleDateSelectionChange}
              onClearFilters={clearFilters}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Gestores Sem GPS</CardTitle>
              <CardDescription>Ranking por ocorrências (filtrado)</CardDescription>
            </CardHeader>
            <CardContent>
              {managerRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ocorrência</p>
              ) : (
                <div className="space-y-2">
                  {managerRanking.map((m, idx) => (
                    <div key={m.manager} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                        <span className="truncate font-medium" title={m.manager}>
                          {getShortManagerName(m.manager)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="text-xs">{m.count}</Badge>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {m.pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Detalhamento ({filteredCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : filteredCount === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma visita sem localização encontrada com os filtros aplicados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Gestor</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.map((v) => {
                      const key = getStatusKey(v);
                      const cfg = STATUS_CONFIG[key];
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateOnlyPtBR(v.visit_date)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={v.manager}>
                            {getShortManagerName(v.manager)}
                          </TableCell>
                          <TableCell>{v.rca_accompanied}</TableCell>
                          <TableCell>{v.client_code}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cfg.className}>
                              <Icon className="h-3 w-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[260px] truncate text-xs text-muted-foreground" title={v.geolocation_error || ""}>
                            {v.geolocation_error || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedVisitId(v.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <VisitDetailsDialog
          visitId={selectedVisitId}
          onClose={() => setSelectedVisitId(null)}
        />
      </div>
    </Layout>
  );
}