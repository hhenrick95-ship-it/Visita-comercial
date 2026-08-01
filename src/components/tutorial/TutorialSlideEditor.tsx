import { useState, useEffect } from "react";
import { TutorialSlide, TutorialSlideScreenshot } from "@/hooks/useTutorialSlides";
import { iconMap } from "./TutorialSlides";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Upload, Image, ChevronDown, AlignLeft, AlignRight, ImageOff, Columns, Rows } from "lucide-react";
import { toast } from "sonner";

interface Props {
  slide: TutorialSlide | null;
  open: boolean;
  onClose: () => void;
  onSave: (slide: Partial<TutorialSlide>) => Promise<void>;
  onUploadScreenshot: (file: File, slideId: string, index?: number) => Promise<string>;
}

const SLIDE_TYPES = [
  { value: "cover", label: "Capa" },
  { value: "content", label: "Conteúdo" },
  { value: "table", label: "Tabela" },
  { value: "diagram", label: "Diagrama" },
  { value: "highlight", label: "Destaque" },
];

const ICON_NAMES = Object.keys(iconMap);

export function TutorialSlideEditor({ slide, open, onClose, onSave, onUploadScreenshot }: Props) {
  const [form, setForm] = useState<Partial<TutorialSlide>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sync form with slide when it changes
  useEffect(() => {
    if (open) {
      if (slide) {
        setForm({ ...slide });
      } else {
        setForm({ type: "content", title: "", block: "", items: [], screenshot_position: "right" });
      }
    }
  }, [slide, open]);

  const updateField = <K extends keyof TutorialSlide>(key: K, value: TutorialSlide[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success("Slide salvo!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Screenshots management
  const screenshots = (form.screenshots ?? []) as TutorialSlideScreenshot[];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file || !form.id) return;
    setUploading(true);
    try {
      const url = await onUploadScreenshot(file, form.id, index ?? screenshots.length);
      if (index !== undefined) {
        // Update existing screenshot
        const updated = [...screenshots];
        updated[index] = { ...updated[index], url };
        updateField("screenshots", updated);
      } else {
        // Add new screenshot
        const width = screenshots.length === 0 ? 100 : Math.floor(100 / (screenshots.length + 1));
        const updated = [...screenshots, { url, width }];
        // Rebalance widths
        const balanced = updated.map(s => ({ ...s, width: Math.floor(100 / updated.length) }));
        updateField("screenshots", balanced);
      }
      // Also set legacy field for backward compat
      if (screenshots.length === 0 && index === undefined) {
        updateField("screenshot_url", url);
      }
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = (index: number) => {
    const updated = screenshots.filter((_, i) => i !== index);
    if (updated.length > 0) {
      const balanced = updated.map(s => ({ ...s, width: Math.floor(100 / updated.length) }));
      updateField("screenshots", balanced);
      updateField("screenshot_url", balanced[0].url);
    } else {
      updateField("screenshots", []);
      updateField("screenshot_url", null);
    }
  };

  const updateScreenshotWidth = (index: number, width: number) => {
    const updated = [...screenshots];
    updated[index] = { ...updated[index], width };
    updateField("screenshots", updated);
  };

  // Items management
  const items = (form.items ?? []) as { icon: string; text: string }[];
  const addItem = () => updateField("items", [...items, { icon: "FileText", text: "" }]);
  const removeItem = (i: number) => updateField("items", items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: "icon" | "text", val: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    updateField("items", updated);
  };

  // Table data management
  const tableData = (form.table_data ?? { headers: [""], rows: [[""]] }) as { headers: string[]; rows: string[][] };
  const updateTableHeader = (i: number, val: string) => {
    const h = [...tableData.headers]; h[i] = val;
    updateField("table_data", { ...tableData, headers: h });
  };
  const addTableCol = () => updateField("table_data", { headers: [...tableData.headers, ""], rows: tableData.rows.map(r => [...r, ""]) });
  const addTableRow = () => updateField("table_data", { ...tableData, rows: [...tableData.rows, tableData.headers.map(() => "")] });
  const updateTableCell = (ri: number, ci: number, val: string) => {
    const rows = tableData.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r);
    updateField("table_data", { ...tableData, rows });
  };
  const removeTableRow = (ri: number) => updateField("table_data", { ...tableData, rows: tableData.rows.filter((_, i) => i !== ri) });

  // Diagram nodes
  const nodes = (form.diagram_nodes ?? []) as { label: string; color: string }[];
  const addNode = () => updateField("diagram_nodes", [...nodes, { label: "", color: "bg-blue-600" }]);
  const removeNode = (i: number) => updateField("diagram_nodes", nodes.filter((_, idx) => idx !== i));
  const updateNode = (i: number, field: "label" | "color", val: string) => {
    const updated = [...nodes]; updated[i] = { ...updated[i], [field]: val };
    updateField("diagram_nodes", updated);
  };

  const screenshotPosition = (form as any).screenshot_position ?? "right";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Slide" : "Novo Slide"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* === CONTEÚDO DO SLIDE === */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type ?? "content"} onValueChange={v => updateField("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLIDE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bloco</Label>
              <Input value={form.block ?? ""} onChange={e => updateField("block", e.target.value)} placeholder="Ex: Introdução" />
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={e => updateField("title", e.target.value)} />
          </div>

          <div>
            <Label>Subtítulo</Label>
            <Textarea value={form.subtitle ?? ""} onChange={e => updateField("subtitle", e.target.value)} rows={2} />
          </div>

          {/* === IMAGENS === */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <Label className="text-base font-semibold">Imagens do Slide ({screenshots.length})</Label>

            {/* Preview gallery */}
            {screenshots.length > 0 ? (
              <div className="space-y-3">
                {screenshots.map((s, i) => (
                  <div key={i} className="rounded-md border bg-background p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <img src={s.url} alt={`Imagem ${i + 1}`} className="h-20 rounded object-contain border" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Largura: {s.width ?? 50}%</Label>
                          <Slider
                            value={[s.width ?? 50]}
                            onValueChange={([v]) => updateScreenshotWidth(i, v)}
                            min={20}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-1">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, i)} />
                            <Button variant="outline" size="sm" asChild disabled={uploading}>
                              <span><Upload className="w-3 h-3 mr-1" />Trocar</span>
                            </Button>
                          </label>
                          <Button variant="ghost" size="sm" onClick={() => removeScreenshot(i)}>
                            <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 rounded-md border-2 border-dashed border-muted-foreground/20 bg-background text-muted-foreground">
                <Image className="w-10 h-10 opacity-40" />
                <span className="text-sm">Nenhuma imagem</span>
              </div>
            )}

            {/* Add new image */}
            {form.id ? (
              <label className="cursor-pointer block">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e)} />
                <Button variant="outline" className="w-full" asChild disabled={uploading}>
                  <span><Plus className="w-4 h-4 mr-2" />{uploading ? "Enviando..." : "Adicionar imagem"}</span>
                </Button>
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">Salve o slide primeiro para fazer upload</p>
            )}

            {/* Posição da imagem */}
            <div>
              <Label className="text-sm mb-2 block">Posição das imagens no slide</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "left", label: "Esquerda", icon: AlignLeft },
                  { value: "right", label: "Direita", icon: AlignRight },
                  { value: "none", label: "Sem imagem", icon: ImageOff },
                ].map(opt => {
                  const Icon = opt.icon;
                  const isActive = screenshotPosition === opt.value || (opt.value === "none" && !screenshotPosition);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, screenshot_position: opt.value === "none" ? null : opt.value }))}
                      className={`flex flex-col items-center gap-1.5 rounded-md border-2 p-3 transition-all text-sm ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout das imagens (horizontal/vertical) */}
            {screenshots.length > 1 && (
              <div>
                <Label className="text-sm mb-2 block">Layout das imagens entre si</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "horizontal", label: "Lado a lado", icon: Columns },
                    { value: "vertical", label: "Empilhadas", icon: Rows },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const screenshotLayout = (form as any).screenshot_layout ?? "horizontal";
                    const isActive = screenshotLayout === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, screenshot_layout: opt.value }))}
                        className={`flex flex-col items-center gap-1.5 rounded-md border-2 p-3 transition-all text-sm ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* === CONTEÚDO ESPECÍFICO (colapsável) === */}
          {form.type === "content" && (
            <Collapsible defaultOpen={items.length > 0}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="w-4 h-4" /> Itens / Tópicos ({items.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={item.icon} onValueChange={v => updateItem(i, "icon", v)}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {ICON_NAMES.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={item.text} onChange={e => updateItem(i, "text", e.target.value)} className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}

          {form.type === "table" && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="w-4 h-4" /> Dados da Tabela
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {tableData.headers.map((h, i) => (
                          <th key={i} className="p-1">
                            <Input value={h} onChange={e => updateTableHeader(i, e.target.value)} placeholder="Cabeçalho" className="text-xs" />
                          </th>
                        ))}
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="p-1">
                              <Input value={cell} onChange={e => updateTableCell(ri, ci, e.target.value)} className="text-xs" />
                            </td>
                          ))}
                          <td className="p-1">
                            <Button variant="ghost" size="icon" onClick={() => removeTableRow(ri)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addTableRow}><Plus className="w-4 h-4 mr-1" /> Linha</Button>
                  <Button variant="outline" size="sm" onClick={addTableCol}><Plus className="w-4 h-4 mr-1" /> Coluna</Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {form.type === "diagram" && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="w-4 h-4" /> Nós do Diagrama ({nodes.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {nodes.map((node, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={node.label} onChange={e => updateNode(i, "label", e.target.value)} className="flex-1" placeholder="Texto do nó" />
                    <Input value={node.color} onChange={e => updateNode(i, "color", e.target.value)} className="w-[140px]" placeholder="bg-blue-600" />
                    <Button variant="ghost" size="icon" onClick={() => removeNode(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addNode}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Nó
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}

          {form.type === "highlight" && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-primary transition-colors">
                <ChevronDown className="w-4 h-4" /> Destaque
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div>
                  <Label>Valor em Destaque</Label>
                  <Input value={form.highlight_value ?? ""} onChange={e => updateField("highlight_value", e.target.value)} placeholder="Ex: PDF" />
                </div>
                <div>
                  <Label>Rótulo</Label>
                  <Input value={form.highlight_label ?? ""} onChange={e => updateField("highlight_label", e.target.value)} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.highlight_description ?? ""} onChange={e => updateField("highlight_description", e.target.value)} rows={3} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
