import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageHeader } from "@/components/PageHeader";
import { useFormTemplates, type FormTemplate } from "@/hooks/useFormTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, FileText, Plus, Settings as SettingsIcon, Trash2, Lock, Edit3, Upload, Download } from "lucide-react";
import { ImportTemplateDialog } from "@/components/form-builder/ImportTemplateDialog";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

export default function FormTemplatesList() {
  const navigate = useNavigate();
  const { templates, loading, reload } = useFormTemplates({ activeOnly: false });

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // (modelo em branco é servido como arquivo estático em /modelo_pedido_formulario.xlsx)
  const [editing, setEditing] = useState<FormTemplate | null>(null);
  const [deleting, setDeleting] = useState<FormTemplate | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresGeo, setRequiresGeo] = useState(false);
  const [generatesPdf, setGeneratesPdf] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleDownloadBlankModel = async () => {
    try {
      const res = await fetch("/modelo_pedido_formulario.xlsx");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo_pedido_formulario.xlsx";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error("Erro ao baixar modelo", { description: e.message });
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setRequiresGeo(false);
    setGeneratesPdf(true);
    setIsActive(true);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (t: FormTemplate) => {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || "");
    setRequiresGeo(t.requires_geolocation);
    setGeneratesPdf(t.generates_pdf);
    setIsActive(t.is_active);
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("form_templates" as any)
          .update({
            name: name.trim(),
            description: description.trim() || null,
            requires_geolocation: requiresGeo,
            generates_pdf: generatesPdf,
            is_active: isActive,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Formulário atualizado");
      } else {
        const baseSlug = slugify(name);
        let slug = baseSlug;
        let counter = 1;
        // garantir slug único
        while (true) {
          const { data: existing } = await supabase
            .from("form_templates" as any)
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (!existing) break;
          counter += 1;
          slug = `${baseSlug}-${counter}`;
        }

        const maxOrder = Math.max(0, ...templates.map((t) => t.display_order || 0));
        const { error } = await supabase.from("form_templates" as any).insert({
          slug,
          name: name.trim(),
          description: description.trim() || null,
          requires_geolocation: requiresGeo,
          generates_pdf: generatesPdf,
          is_active: isActive,
          is_system: false,
          display_order: maxOrder + 1,
        });
        if (error) throw error;
        toast.success("Formulário criado! Adicione seções e perguntas.");
      }
      setCreateOpen(false);
      reload();
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (deleting.is_system) {
      toast.error("Não é possível excluir um formulário do sistema.");
      setDeleting(null);
      return;
    }
    try {
      const { error } = await supabase
        .from("form_templates" as any)
        .delete()
        .eq("id", deleting.id);
      if (error) throw error;
      toast.success("Formulário excluído");
      setDeleting(null);
      reload();
    } catch (e: any) {
      toast.error("Erro ao excluir", { description: e.message });
    }
  };

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-4rem)] bg-mesh">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <PageHeader
              icon={SettingsIcon}
              title="Construtor de Formulários"
              description="Gerencie todos os modelos de formulários disponíveis no sistema"
              actions={
                <>
                  <Button
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                    className="glass-card border-0"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadBlankModel}
                    className="glass-card border-0"
                    title="Baixa um modelo Excel em branco para criar um novo formulário"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar modelo
                  </Button>
                  <Button
                    onClick={openCreate}
                    className="bg-hero-gradient text-primary-foreground border-0 shadow-md hover:opacity-95"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Formulário
                  </Button>
                </>
              }
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[40vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : templates.length === 0 ? (
            <Card className="glass-card border-0">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">Nenhum formulário cadastrado ainda.</p>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro formulário
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Card key={t.id} className="glass-card border-0 hover:shadow-xl transition-all group">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg truncate">{t.name}</CardTitle>
                          {t.is_system && (
                            <Badge variant="secondary" className="shrink-0">
                              <Lock className="h-3 w-3 mr-1" />
                              Sistema
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {t.description || "Sem descrição"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {!t.is_active && <Badge variant="outline">Inativo</Badge>}
                      {t.requires_geolocation && <Badge variant="outline" className="bg-primary/5">GPS</Badge>}
                      {t.generates_pdf && <Badge variant="outline" className="bg-secondary/10">PDF</Badge>}
                      <Badge variant="outline" className="font-mono text-xs">/{t.slug}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-hero-gradient text-primary-foreground border-0 hover:opacity-95"
                        onClick={() => navigate(`/form-builder/${t.id}`)}
                      >
                        Editar perguntas
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      {!t.is_system && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleting(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar formulário" : "Novo formulário"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize as informações do modelo de formulário."
                : "Defina um novo modelo de formulário. Você poderá adicionar seções e perguntas em seguida."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Nome *</Label>
              <Input
                id="t-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mix de Ouro Danone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Descrição</Label>
              <Textarea
                id="t-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Para que serve esse formulário?"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="t-geo" className="cursor-pointer">Exigir geolocalização (GPS)</Label>
                <p className="text-xs text-muted-foreground">Captura latitude/longitude no envio</p>
              </div>
              <Switch id="t-geo" checked={requiresGeo} onCheckedChange={setRequiresGeo} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="t-pdf" className="cursor-pointer">Gerar PDF do envio</Label>
                <p className="text-xs text-muted-foreground">Exporta o formulário preenchido em PDF</p>
              </div>
              <Switch id="t-pdf" checked={generatesPdf} onCheckedChange={setGeneratesPdf} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="t-active" className="cursor-pointer">Ativo</Label>
                <p className="text-xs text-muted-foreground">Aparece na lista de novos registros</p>
              </div>
              <Switch id="t-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-hero-gradient text-primary-foreground border-0"
            >
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar formulário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Todas as seções, perguntas
              e envios desse formulário serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportTemplateDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={reload}
      />
    </Layout>
  );
}
