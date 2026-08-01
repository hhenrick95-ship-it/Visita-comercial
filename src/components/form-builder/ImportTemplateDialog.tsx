import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertTriangle, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  parseFormTemplateXLSX,
  type ParsedTemplate,
} from "@/lib/importFormTemplateXLSX";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}

export function ImportTemplateDialog({ open, onOpenChange, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedTemplate | null>(null);
  const [fileName, setFileName] = useState("");

  // metadados
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresGeo, setRequiresGeo] = useState(true);
  const [generatesPdf, setGeneratesPdf] = useState(true);

  const reset = () => {
    setParsed(null);
    setFileName("");
    setName("");
    setDescription("");
    setRequiresGeo(true);
    setGeneratesPdf(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const result = await parseFormTemplateXLSX(file);
      setParsed(result);
      setFileName(file.name);
      // sugere nome a partir do arquivo
      const suggested = file.name
        .replace(/\.xlsx?$/i, "")
        .replace(/[_-]+/g, " ")
        .trim();
      setName(suggested);
    } catch (e: any) {
      toast.error("Erro ao ler planilha", { description: e.message });
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    if (!name.trim()) {
      toast.error("Dê um nome ao formulário");
      return;
    }
    setImporting(true);
    try {
      // 1. Slug único
      const baseSlug = slugify(name);
      let slug = baseSlug;
      let i = 1;
      while (true) {
        const { data: existing } = await supabase
          .from("form_templates" as any)
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        i++;
        slug = `${baseSlug}-${i}`;
      }

      // 2. display_order do template
      const { data: maxRow } = await supabase
        .from("form_templates" as any)
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((maxRow as any)?.display_order || 0) + 1;

      // 3. Cria template
      const { data: tpl, error: tplErr } = await supabase
        .from("form_templates" as any)
        .insert({
          slug,
          name: name.trim(),
          description: description.trim() || null,
          requires_geolocation: requiresGeo,
          generates_pdf: generatesPdf,
          is_active: true,
          is_system: false,
          display_order: nextOrder,
        })
        .select("id")
        .single();
      if (tplErr) throw tplErr;
      const templateId = (tpl as any).id;

      // 4. Cria seções e perguntas
      // refMap: question_ref do parser -> id real no banco (para resolver condicionais)
      const refMap = new Map<string, string>();
      // perguntas que precisam de pós-update de condicional
      const condQueue: Array<{ qId: string; targetRef: string; operator: string; value: string }> = [];
      // perguntas vendor_select que precisam ser vinculadas ao team_select anterior
      // da mesma seção (para que o dropdown de RCA funcione)
      const vendorLinkQueue: Array<{ qId: string; sectionTeamRef: string | null }> = [];
      // perguntas team_select que precisam de role_filter inferido pelo label
      const roleFilterQueue: Array<{ qId: string; role: "gerente" | "supervisor" | "coordenador" }> = [];

      for (const section of parsed.sections) {
        const { data: secData, error: secErr } = await supabase
          .from("form_sections")
          .insert({
            template_id: templateId,
            title: section.title,
            description: null,
            display_order: section.display_order,
            is_active: true,
          })
          .select("id")
          .single();
        if (secErr) throw secErr;
        const sectionId = (secData as any).id;

        // rastreia o último team_select inserido nesta seção para vincular RCAs
        let lastTeamRefInSection: string | null = null;

        for (const q of section.questions) {
          const { data: qData, error: qErr } = await supabase
            .from("form_questions")
            .insert({
              section_id: sectionId,
              question_type: q.question_type,
              label: q.label,
              description: null,
              placeholder: null,
              is_required: q.is_required,
              is_active: true,
              is_chart_metric: false,
              options: q.options as any,
              slider_config: q.slider_config as any,
              conditional_logic: null,
              display_order: q.display_order,
            })
            .select("id")
            .single();
          if (qErr) throw qErr;
          const qId = (qData as any).id;
          refMap.set(q.question_ref, qId);

          if (q.conditional_show_when) {
            condQueue.push({
              qId,
              targetRef: q.conditional_show_when.question_ref,
              operator: q.conditional_show_when.operator,
              value: q.conditional_show_when.value,
            });
          }

          if (q.question_type === "team_select") {
            lastTeamRefInSection = q.question_ref;
            const lbl = q.label.toLowerCase();
            if (lbl.includes("gerente")) {
              roleFilterQueue.push({ qId, role: "gerente" });
            } else if (lbl.includes("supervisor")) {
              roleFilterQueue.push({ qId, role: "supervisor" });
            } else if (lbl.includes("coordenador")) {
              roleFilterQueue.push({ qId, role: "coordenador" });
            }
          }

          if (q.question_type === "vendor_select") {
            vendorLinkQueue.push({ qId, sectionTeamRef: lastTeamRefInSection });
          }
        }
      }

      // 5. Resolve condicionais (segundo passo, agora que temos os IDs)
      for (const c of condQueue) {
        const targetId = refMap.get(c.targetRef);
        if (!targetId) continue;
        await supabase
          .from("form_questions")
          .update({
            conditional_logic: {
              show_when: {
                question_id: targetId,
                operator: c.operator,
                value: c.value,
              },
            },
          })
          .eq("id", c.qId);
      }

      // 5b. Vincula RCAs ao team_select anterior da mesma seção
      for (const link of vendorLinkQueue) {
        if (!link.sectionTeamRef) continue;
        const teamId = refMap.get(link.sectionTeamRef);
        if (!teamId) continue;
        // Lê condicional atual para preservar show_when (caso exista)
        const { data: existing } = await supabase
          .from("form_questions")
          .select("conditional_logic")
          .eq("id", link.qId)
          .maybeSingle();
        const current = ((existing as any)?.conditional_logic as Record<string, unknown>) || {};
        await supabase
          .from("form_questions")
          .update({
            conditional_logic: { ...current, team_question_id: teamId },
          })
          .eq("id", link.qId);
      }

      // 5c. Aplica role_filter inferido por label nos team_select
      for (const rf of roleFilterQueue) {
        const { data: existing } = await supabase
          .from("form_questions")
          .select("conditional_logic")
          .eq("id", rf.qId)
          .maybeSingle();
        const current = ((existing as any)?.conditional_logic as Record<string, unknown>) || {};
        await supabase
          .from("form_questions")
          .update({
            conditional_logic: { ...current, role_filter: rf.role },
          })
          .eq("id", rf.qId);
      }

      toast.success(
        `Formulário "${name}" criado com ${parsed.sections.length} seções e ${parsed.totalQuestions} perguntas!`,
      );
      onImported();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error("Erro ao importar", { description: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar formulário do Excel
          </DialogTitle>
          <DialogDescription>
            Suba uma planilha no formato simplificado. O sistema cria automaticamente as seções,
            perguntas, opções e condicionais.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 py-2">
            {/* Download do modelo */}
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>Não tem o modelo? Baixe o exemplo pronto.</span>
                <a
                  href="/modelo_pedido_formulario.xlsx"
                  download
                  className="text-primary underline text-sm font-medium whitespace-nowrap"
                >
                  Baixar modelo.xlsx
                </a>
              </AlertDescription>
            </Alert>

            {/* Upload */}
            {!parsed && (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">
                  {parsing ? "Lendo planilha..." : "Clique para selecionar a planilha"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivo .xlsx com colunas: Seção · Ordem · Pergunta · Tipo · Opções · Obrigatório · Mostrar se Pergunta · Mostrar se Valor
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            )}

            {/* Preview */}
            {parsed && (
              <>
                <Alert className="border-success bg-success/5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertDescription>
                    <strong>{fileName}</strong> lido com sucesso —{" "}
                    <strong>{parsed.sections.length} seções</strong> e{" "}
                    <strong>{parsed.totalQuestions} perguntas</strong> serão criadas.
                  </AlertDescription>
                </Alert>

                {parsed.warnings.length > 0 && (
                  <Alert variant="destructive" className="bg-yellow-500/5 border-yellow-500/40 text-foreground">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <strong>Avisos:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5 text-sm">
                        {parsed.warnings.slice(0, 6).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                        {parsed.warnings.length > 6 && (
                          <li>... e mais {parsed.warnings.length - 6}</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="imp-name">Nome do formulário *</Label>
                  <Input
                    id="imp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: PEX - Visita Gerente"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="imp-desc">Descrição</Label>
                  <Textarea
                    id="imp-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="imp-geo" className="cursor-pointer text-sm">GPS</Label>
                    <Switch id="imp-geo" checked={requiresGeo} onCheckedChange={setRequiresGeo} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="imp-pdf" className="cursor-pointer text-sm">Gerar PDF</Label>
                    <Switch id="imp-pdf" checked={generatesPdf} onCheckedChange={setGeneratesPdf} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pré-visualização da estrutura</Label>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {parsed.sections.map((sec, i) => (
                      <div key={i} className="p-3">
                        <div className="font-medium text-sm mb-1.5">
                          {sec.display_order}. {sec.title}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({sec.questions.length})
                          </span>
                        </div>
                        <div className="space-y-1 pl-3">
                          {sec.questions.map((q, j) => (
                            <div key={j} className="text-xs flex items-center gap-1.5 flex-wrap">
                              <span className="text-muted-foreground">#{q.display_order}</span>
                              <span>{q.label}</span>
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                {q.question_type}
                              </Badge>
                              {q.is_required && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4">
                                  obrig.
                                </Badge>
                              )}
                              {q.conditional_show_when && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-primary/10">
                                  condicional
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          {parsed && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>
                Trocar arquivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                className="bg-hero-gradient text-primary-foreground border-0"
              >
                {importing ? "Importando..." : "Criar formulário"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}