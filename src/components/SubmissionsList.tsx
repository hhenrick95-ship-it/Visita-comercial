import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye, Loader2, FileText, MapPin, Calendar, Trash2 } from "lucide-react";
import { useFormSubmissions } from "@/hooks/useFormSubmissions";
import type { FormTemplate } from "@/hooks/useFormTemplates";
import { generateGenericFormPDF } from "@/lib/generateGenericFormPDF";
import { toast } from "sonner";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { calendarDateToLocal } from "@/lib/formDate";
import { matchesSubmissionFilters } from "@/lib/submissionFilters";
import { DateTreeFilter } from "@/components/ui/date-tree-filter";
import { Combobox } from "@/components/ui/combobox";
import { SubmissionDatePicker } from "@/components/SubmissionDatePicker";
import { supabase } from "@/integrations/supabase/client";
import { SubmissionsDashboard, type Drill } from "@/components/SubmissionsDashboard";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  template: FormTemplate;
}

const normalizeLabel = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("pt-BR");

/**
 * Lists submissions for a non-"visita" template. Provides search, KPIs and
 * per-row PDF download.
 */
export function SubmissionsList({ template }: Props) {
  const { submissions, loading, reload } = useFormSubmissions(template.id);
  const { role } = useAuth();
  const usesRouteResponsible = /pex.*visita.*(gerente|supervisor)/i.test(normalizeLabel(template.name));
  const [search, setSearch] = useState("");
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [years, setYears] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [responsibleNames, setResponsibleNames] = useState<Record<string, string>>({});
  const [drill, setDrill] = useState<Drill | null>(null);

  const handleResponsiblesChange = useCallback((next: Record<string, string>) => {
    setResponsibleNames(previous => {
      if (Object.entries(next).every(([id, name]) => previous[id] === name)) return previous;
      return { ...previous, ...next };
    });
  }, []);

  const clearFilters = () => {
    setSearch(""); setYears([]); setMonths([]); setCollaborators([]); setStart(""); setEnd(""); setDrill(null);
  };

  useEffect(() => {
    clearFilters();
    setPreviewId(null);
    setResponsibleNames({});
  }, [template.id]);

  useEffect(() => {
    let active = true;
    const ids = [...new Set(submissions.map(s => s.created_by).filter((id): id is string => Boolean(id)))];
    setNames({});
    if (!ids.length) return;
    supabase.from("profiles").select("id, full_name, email").in("id", ids).then(({ data, error }) => {
      if (!active) return;
      if (error) { toast.error("Não foi possível carregar os nomes dos colaboradores."); return; }
      setNames(Object.fromEntries((data || []).map(p => [p.id, p.full_name || p.email])));
    });
    return () => { active = false; };
  }, [submissions]);

  const collaboratorOptions = useMemo(() => {
    if (usesRouteResponsible) {
      return [...new Set(submissions.map(s => responsibleNames[s.id] || "Responsável da rota não informado"))]
        .map(name => ({ value: name, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    }
    return [...new Set(submissions.map(s => s.created_by || "unknown"))]
      .map(id => ({ value: id, label: names[id] || (id === "unknown" ? "Sem colaborador" : `Colaborador (${id.slice(0, 8)})`) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [submissions, names, responsibleNames, usesRouteResponsible]);

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      const personName = usesRouteResponsible
        ? responsibleNames[s.id] || "Responsável da rota não informado"
        : names[s.created_by || ""];
      const personKey = usesRouteResponsible ? personName : s.created_by || "unknown";
      return matchesSubmissionFilters(s, { years, months, collaborators, start, end, search }, personName, personKey);
    });
  }, [submissions, search, years, months, collaborators, start, end, names, responsibleNames, usesRouteResponsible]);

  const visiblePreviewData = useMemo(() => usesRouteResponsible
    ? previewData.filter((row: any) => !normalizeLabel(row.form_questions?.label).includes("comentarios adicionais"))
    : previewData, [previewData, usesRouteResponsible]);

  useEffect(() => { setDrill(null); }, [filtered]);

  const listed = useMemo(() => {
    if (!drill) return filtered;
    const ids = new Set(drill.ids);
    return filtered.filter(s => ids.has(s.id));
  }, [filtered, drill]);

  const handlePdf = async (id: string) => {
    if (!template.generates_pdf) {
      toast.info("Este formulário não gera PDF.");
      return;
    }
    setPdfId(id);
    try {
      await generateGenericFormPDF(id);
      toast.success("PDF gerado!");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    } finally {
      setPdfId(null);
    }
  };

  const handlePreview = async (id: string) => {
    if (previewId === id) {
      setPreviewId(null);
      setPreviewData([]);
      return;
    }
    setPreviewId(id);
    setPreviewData([]);
    const { data } = await supabase
      .from("form_responses")
      .select("response_value, form_questions!inner(label, question_type)")
      .eq("submission_id", id);
    setPreviewData((data || []) as any);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await supabase.from("form_responses").delete().eq("submission_id", deleteId);
      const { error } = await supabase.from("form_submissions").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Registro excluído com sucesso!");
      setDeleteId(null);
      reload();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de registros</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Com geolocalização</p>
            <p className="text-2xl font-bold">
              {filtered.filter((s) => s.latitude && s.longitude).length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            <p className="text-2xl font-bold">
              {
                filtered.filter((s) => {
                  const d = calendarDateToLocal(s.visit_date).getTime();
                  return d > Date.now() - 30 * 86400000;
                }).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <section aria-label="Filtros de registros" className="space-y-4">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DateTreeFilter availableDates={submissions.map(s => s.visit_date)} selectedYears={years} selectedMonths={months}
            onSelectionChange={(nextYears, nextMonths) => { setYears(nextYears); setMonths(nextMonths); }} />
          <div className="space-y-2 min-w-0">
            <p className="text-sm font-medium">{usesRouteResponsible ? "Responsável da rota" : "Colaborador"}</p>
            <Combobox options={collaboratorOptions} multiple values={collaborators} onValuesChange={setCollaborators}
              placeholder={usesRouteResponsible ? "Todos os responsáveis" : "Todos os colaboradores"} searchPlaceholder={usesRouteResponsible ? "Buscar responsável..." : "Buscar colaborador..."} className="min-h-11" />
          </div>
          <SubmissionDatePicker label="Data inicial" value={start} onChange={setStart} to={end} />
          <SubmissionDatePicker label="Data final" value={end} onChange={setEnd} from={start} />
        </div>
        <Button variant="outline" onClick={clearFilters} className="min-h-11">Limpar filtros</Button>
      </section>

      <SubmissionsDashboard templateId={template.id} templateName={template.name} submissions={filtered} names={names} onDrill={setDrill} onResponsiblesChange={usesRouteResponsible ? handleResponsiblesChange : undefined} />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={usesRouteResponsible ? "Buscar por responsável, endereço ou identificação..." : "Buscar por colaborador, endereço ou identificação..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <Card id="lista-registros" className="glass-card border-0 scroll-mt-4">
        <CardHeader>
          {drill && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/10 p-3 text-sm mb-2">
              <span>Mostrando só: <b>{drill.label}</b></span>
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => setDrill(null)}>Ver todos</Button>
            </div>
          )}
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {listed.length} registro(s)
          </CardTitle>
          <CardDescription>{template.description || template.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {listed.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {listed.map((s) => {
                const meta = Object.entries(s.metadata || {}).slice(0, 3);
                const isOpen = previewId === s.id;
                return (
                  <div
                    key={s.id}
                    className="border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateOnlyPtBR(s.visit_date)}
                          </p>
                          <p className="text-sm mt-1 break-words">{usesRouteResponsible
                            ? responsibleNames[s.id] || "Responsável da rota não informado"
                            : names[s.created_by || ""] || (s.created_by ? "Colaborador não identificado" : "Sem colaborador")}</p>
                          {meta.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {meta.map(([k, v]) => `${k}: ${v}`).join(" • ")}
                            </p>
                          )}
                          {s.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                              <MapPin className="h-3 w-3" />
                              {s.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(s.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">{isOpen ? "Fechar" : "Ver"}</span>
                        </Button>
                        {template.generates_pdf && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePdf(s.id)}
                            disabled={pdfId === s.id}
                            className="gap-2"
                          >
                            {pdfId === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">PDF</span>
                          </Button>
                        )}
                        {role === "admin" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteId(s.id)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Excluir</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="grid gap-2 mt-3">
                          {previewData.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">
                              Carregando...
                            </p>
                          ) : visiblePreviewData.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">Nenhum detalhe adicional para exibir.</p>
                          ) : (
                            visiblePreviewData.map((r: any, i: number) => (
                              <div
                                key={i}
                                className="text-xs grid grid-cols-1 md:grid-cols-3 gap-2 py-1 border-b last:border-0"
                              >
                                <span className="font-medium text-muted-foreground">
                                  {r.form_questions?.label}
                                </span>
                                <span className="md:col-span-2 break-words">
                                  {typeof r.response_value === "boolean"
                                    ? r.response_value
                                      ? "Sim"
                                      : "Não"
                                    : Array.isArray(r.response_value)
                                    ? r.response_value.length === 0
                                      ? "—"
                                      : `${r.response_value.length} item(ns)`
                                    : String(r.response_value || "—")}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IA específica para este template */}
      <AIInsightsPanel
        filters={{ submissionIds: filtered.map(s => s.id) } as any}
        templateId={template.id}
        templateName={template.name}
        contextualKPIs={{
          totalVisits: filtered.length,
          totalFeedbacks: 0,
          activeManagers: 0,
          periodDays: 30,
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro e todas as respostas serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
