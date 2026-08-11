import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  CheckCircle2,
  Clock,
  PercentIcon,
  Search,
  Download,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientEditDialog, type ClientRow } from "@/components/ClientEditDialog";
import { exportClientUpdatesXLSX, maskPhoneBR } from "@/lib/exportClientUpdatesXLSX";

const PAGE_SIZE = 20;

export default function ClientUpdate() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  // Codcli dos clientes vinculados ao RCA atualmente selecionado no filtro (vínculo extra,
  // fora do cod_rca principal). Buscado sob demanda, só para o RCA escolhido, para não ter
  // que carregar a tabela de vínculos inteira (pode chegar a centenas de milhares de linhas).
  const [secondaryLinkedCods, setSecondaryLinkedCods] = useState<Set<number>>(new Set());
  const [rcaFilter, setRcaFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Paginar para superar o limite padrão de 1000 do PostgREST.
      const PAGE = 1000;
      let from = 0;
      const all: ClientRow[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("clientes_cadastro")
          .select(
            "codcli,razao_social,nome_fantasia,cnpj,cidade,uf,cod_rca,nome_rca,ramo_atividade,qtd_checkouts,telefone,email,status_atualizacao,fotos"
          )
          .order("razao_social", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = (data || []) as ClientRow[];
        all.push(...batch);
        if (batch.length < PAGE) break;
        from += PAGE;
        if (from > 100000) break; // segurança
      }
      setClients(all);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Vínculo extra cliente x RCA (fora do cod_rca principal), buscado só para o RCA
  // selecionado no filtro — evita carregar a tabela de vínculos inteira na memória.
  useEffect(() => {
    if (rcaFilter === "__all__") {
      setSecondaryLinkedCods(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const PAGE = 1000;
        let from = 0;
        const codes = new Set<number>();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await supabase
            .from("clientes_cadastro_rcas")
            .select("codcli")
            .eq("cod_rca", rcaFilter)
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const batch = data || [];
          for (const l of batch as any[]) codes.add(l.codcli);
          if (batch.length < PAGE) break;
          from += PAGE;
          if (from > 50000) break; // segurança
        }
        if (!cancelled) setSecondaryLinkedCods(codes);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setSecondaryLinkedCods(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rcaFilter]);

  // RCAs disponíveis (a partir do RCA principal de cada cliente)
  const rcas = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) {
      if (c.cod_rca) map.set(c.cod_rca, c.nome_rca || c.cod_rca);
    }
    return Array.from(map.entries())
      .map(([cod, nome]) => ({ cod, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (rcaFilter !== "__all__") {
        const linked = c.cod_rca === rcaFilter || secondaryLinkedCods.has(c.codcli);
        if (!linked) return false;
      }
      if (statusFilter !== "todos" && c.status_atualizacao !== statusFilter) return false;
      if (!q) return true;
      return (
        String(c.codcli).includes(q) ||
        (c.razao_social || "").toLowerCase().includes(q) ||
        (c.nome_fantasia || "").toLowerCase().includes(q) ||
        (c.cnpj || "").toLowerCase().includes(q)
      );
    });
  }, [clients, rcaFilter, statusFilter, search, secondaryLinkedCods]);

  useEffect(() => {
    setPage(1);
  }, [rcaFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const atualizados = filtered.filter((c) => c.status_atualizacao === "atualizado").length;
    const pendentes = total - atualizados;
    const pct = total > 0 ? Math.round((atualizados / total) * 100) : 0;
    return { total, atualizados, pendentes, pct };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportClientUpdatesXLSX(rcaFilter !== "__all__" ? rcaFilter : null);
      toast.success("Exportação concluída");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Atualização Cadastral de Clientes
            </h1>
            <p className="text-sm text-muted-foreground">
              Atualize Ramo de Atividade, Telefone e E-mail dos clientes dos seus RCAs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExport} disabled={exporting} className="bg-primary text-primary-foreground">
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar Atualizações
            </Button>
          </div>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Total de Clientes" value={stats.total} tone="blue" />
          <KpiCard icon={CheckCircle2} label="Atualizados" value={stats.atualizados} tone="green" />
          <KpiCard icon={Clock} label="Pendentes" value={stats.pendentes} tone="amber" />
          <KpiCard icon={PercentIcon} label="Conclusão" value={`${stats.pct}%`} tone="blue" />
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.pct} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.atualizados} de {stats.total} clientes atualizados ({stats.pct}%)
            </p>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>RCA</Label>
                <Select value={rcaFilter} onValueChange={setRcaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os RCAs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os RCAs</SelectItem>
                    {rcas.map((r) => (
                      <SelectItem key={r.cod} value={r.cod}>
                        {r.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="atualizado">Atualizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Pesquisar</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Código, Razão Social, Fantasia ou CNPJ"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin inline mr-2" />
                Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                Nenhum cliente encontrado com os filtros atuais.
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>Ramo</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((c) => (
                        <TableRow key={c.codcli}>
                          <TableCell className="font-mono text-xs">{c.codcli}</TableCell>
                          <TableCell className="max-w-[240px]">
                            <div className="font-medium truncate" title={c.razao_social}>
                              {c.razao_social}
                            </div>
                            {c.nome_fantasia && (
                              <div className="text-xs text-muted-foreground truncate">
                                {c.nome_fantasia}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate" title={c.ramo_atividade || ""}>
                            {c.ramo_atividade || "-"}
                          </TableCell>
                          <TableCell>{c.telefone ? maskPhoneBR(c.telefone) : "-"}</TableCell>
                          <TableCell className="max-w-[180px] truncate" title={c.email || ""}>
                            {c.email || "-"}
                          </TableCell>
                          <TableCell>
                            {c.status_atualizacao === "atualizado" ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600">Atualizado</Badge>
                            ) : (
                              <Badge variant="secondary">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(c);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y">
                  {pageRows.map((c) => (
                    <div key={c.codcli} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-muted-foreground">#{c.codcli}</div>
                          <div className="font-semibold truncate">{c.razao_social}</div>
                          {c.nome_fantasia && (
                            <div className="text-xs text-muted-foreground truncate">{c.nome_fantasia}</div>
                          )}
                        </div>
                        {c.status_atualizacao === "atualizado" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 shrink-0">Atualizado</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">Pendente</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Ramo: {c.ramo_atividade || "-"}</div>
                        <div>Tel: {c.telefone ? maskPhoneBR(c.telefone) : "-"}</div>
                        <div className="truncate">E-mail: {c.email || "-"}</div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Página {page} de {totalPages} · {filtered.length} clientes
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <ClientEditDialog
          client={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={load}
        />
      </div>
    </Layout>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number | string;
  tone: "blue" | "green" | "amber";
}) {
  const toneMap = {
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  }[tone];
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${toneMap}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}