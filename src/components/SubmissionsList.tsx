import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye, Loader2, FileText, MapPin, Calendar, Trash2 } from "lucide-react";
import { useFormSubmissions } from "@/hooks/useFormSubmissions";
import type { FormTemplate } from "@/hooks/useFormTemplates";
import { generateGenericFormPDF } from "@/lib/generateGenericFormPDF";
import { toast } from "sonner";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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

/**
 * Lists submissions for a non-"visita" template. Provides search, KPIs and
 * per-row PDF download.
 */
export function SubmissionsList({ template }: Props) {
  const { submissions, loading, reload } = useFormSubmissions(template.id);
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return submissions;
    const t = search.toLowerCase();
    return submissions.filter(
      (s) =>
        s.address?.toLowerCase().includes(t) ||
        Object.values(s.metadata || {}).some((v) => String(v).toLowerCase().includes(t))
    );
  }, [submissions, search]);

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
            <p className="text-2xl font-bold">{submissions.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Com geolocalização</p>
            <p className="text-2xl font-bold">
              {submissions.filter((s) => s.latitude && s.longitude).length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            <p className="text-2xl font-bold">
              {
                submissions.filter((s) => {
                  const d = new Date(s.submitted_at).getTime();
                  return d > Date.now() - 30 * 86400000;
                }).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por endereço ou identificação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {filtered.length} registro(s)
          </CardTitle>
          <CardDescription>{template.description || template.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
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
                            {formatDateOnlyPtBR(s.submitted_at.substring(0, 10))}
                          </p>
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
                          ) : (
                            previewData.map((r: any, i: number) => (
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
        filters={{}}
        templateId={template.id}
        templateName={template.name}
        contextualKPIs={{
          totalVisits: submissions.length,
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