import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Download, Link2, Star } from "lucide-react";
import { toast } from "sonner";

interface Resposta {
  id: string;
  created_at: string;
  cliente_nome: string | null;
  cliente_codigo: string | null;
  entrega_no_prazo: string;
  condicao_produtos: string;
  pedido_correto: string;
  nota_atendimento: number;
  nota_satisfacao: number;
  sugestao_melhoria: string | null;
}

const LABELS: Record<string, Record<string, string>> = {
  entrega_no_prazo: { sim: "Sim", nao: "Não" },
  condicao_produtos: { sim_todos: "Sim, todos", parcialmente: "Parcialmente", nao: "Não" },
  pedido_correto: {
    totalmente_correto: "Totalmente correto",
    pequenas_divergencias: "Pequenas divergências",
    divergencias_relevantes: "Divergências relevantes",
  },
};

const PERGUNTAS: { key: keyof typeof LABELS; title: string; good: string }[] = [
  { key: "entrega_no_prazo", title: "Entrega dentro do prazo", good: "sim" },
  { key: "condicao_produtos", title: "Produtos em boas condições", good: "sim_todos" },
  { key: "pedido_correto", title: "Pedido correto", good: "totalmente_correto" },
];

const PUBLIC_PATH = "/pesquisa/satisfacao-logistica";

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </span>
);

export default function SatisfacaoLogisticaResultados() {
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pesquisa_satisfacao_logistica")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error("Erro ao carregar respostas", { description: error.message });
      setRespostas((data || []) as Resposta[]);
      setLoading(false);
    })();
  }, []);

  const total = respostas.length;

  const resumo = useMemo(() => {
    const dist = (key: string) => {
      const c: Record<string, number> = {};
      respostas.forEach((r) => {
        const v = (r as any)[key];
        c[v] = (c[v] || 0) + 1;
      });
      return c;
    };
    return {
      perguntas: PERGUNTAS.map((p) => ({ ...p, dist: dist(p.key) })),
      mediaAtendimento: avg(respostas.map((r) => r.nota_atendimento)),
      mediaSatisfacao: avg(respostas.map((r) => r.nota_satisfacao)),
    };
  }, [respostas]);

  const copyLink = async () => {
    const url = `${window.location.origin}${PUBLIC_PATH}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: url });
    } catch {
      toast.info(url);
    }
  };

  const exportCSV = () => {
    const header = [
      "Data", "Cliente", "Código", "Entrega no prazo", "Condição dos produtos", "Pedido correto",
      "Nota atendimento", "Nota satisfação", "Sugestão",
    ];
    const rows = respostas.map((r) => [
      fmtDate(r.created_at), r.cliente_nome, r.cliente_codigo,
      LABELS.entrega_no_prazo[r.entrega_no_prazo], LABELS.condicao_produtos[r.condicao_produtos],
      LABELS.pedido_correto[r.pedido_correto], r.nota_atendimento, r.nota_satisfacao, r.sugestao_melhoria,
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCSV).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `satisfacao_logistica_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader
          icon={Truck}
          title="Satisfação Logística"
          description="Respostas da Pesquisa de Qualidade da Entrega"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyLink}>
                <Link2 className="h-4 w-4 mr-2" />
                Copiar link da pesquisa
              </Button>
              <Button onClick={exportCSV} disabled={!total}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          }
        />

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : total === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma resposta ainda. Copie o link da pesquisa e envie aos clientes.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
              <Card>
                <CardHeader className="pb-2"><CardDescription>Respostas</CardDescription></CardHeader>
                <CardContent><p className="text-3xl font-bold">{total}</p></CardContent>
              </Card>
              {resumo.perguntas.map((p) => (
                <Card key={p.key}>
                  <CardHeader className="pb-2"><CardDescription>{p.title}</CardDescription></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{pct(p.dist[p.good] || 0, total)}%</p></CardContent>
                </Card>
              ))}
              <Card>
                <CardHeader className="pb-2"><CardDescription>Nota atendimento</CardDescription></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{resumo.mediaAtendimento.toFixed(1).replace(".", ",")}</p>
                  <Stars n={Math.round(resumo.mediaAtendimento)} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Satisfação geral</CardDescription></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{resumo.mediaSatisfacao.toFixed(1).replace(".", ",")}</p>
                  <Stars n={Math.round(resumo.mediaSatisfacao)} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {resumo.perguntas.map((p) => (
                <Card key={p.key}>
                  <CardHeader className="pb-3"><CardTitle className="text-base">{p.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(LABELS[p.key]).map(([value, label]) => {
                      const n = p.dist[value] || 0;
                      return (
                        <div key={value} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{label}</span>
                            <span className="text-muted-foreground">{n} · {pct(n, total)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${value === p.good ? "bg-green-500" : "bg-amber-500"}`}
                              style={{ width: `${pct(n, total)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Respostas</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Produtos</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Atendimento</TableHead>
                      <TableHead>Satisfação</TableHead>
                      <TableHead>Sugestão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {respostas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                        <TableCell>
                          {r.cliente_nome || "—"}
                          {r.cliente_codigo && <span className="block text-xs text-muted-foreground">Cód. {r.cliente_codigo}</span>}
                        </TableCell>
                        <TableCell>{LABELS.entrega_no_prazo[r.entrega_no_prazo]}</TableCell>
                        <TableCell>{LABELS.condicao_produtos[r.condicao_produtos]}</TableCell>
                        <TableCell>{LABELS.pedido_correto[r.pedido_correto]}</TableCell>
                        <TableCell><Stars n={r.nota_atendimento} /></TableCell>
                        <TableCell><Stars n={r.nota_satisfacao} /></TableCell>
                        <TableCell className="max-w-xs text-sm">{r.sugestao_melhoria || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
