import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackTemplate {
  id: string;
  name: string;
  description: string | null;
  constructive_criticism: string;
  action_plan: string;
  is_public: boolean;
  created_by: string | null;
}

interface FeedbackTemplatesProps {
  onSelectTemplate: (template: { constructive_criticism: string; action_plan: string }) => void;
}

export function FeedbackTemplates({ onSelectTemplate }: FeedbackTemplatesProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    constructive_criticism: "",
    action_plan: "",
    is_public: false
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates((data as FeedbackTemplate[]) || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const handleSelectTemplate = (template: FeedbackTemplate) => {
    onSelectTemplate({
      constructive_criticism: template.constructive_criticism,
      action_plan: template.action_plan
    });
    setIsOpen(false);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.constructive_criticism || !newTemplate.action_plan) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("feedback_templates")
        .insert({
          name: newTemplate.name,
          description: newTemplate.description || null,
          constructive_criticism: newTemplate.constructive_criticism,
          action_plan: newTemplate.action_plan,
          is_public: newTemplate.is_public,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success("Template criado com sucesso!");
      setShowCreateDialog(false);
      setNewTemplate({
        name: "",
        description: "",
        constructive_criticism: "",
        action_plan: "",
        is_public: false
      });
      fetchTemplates();
    } catch (error: any) {
      toast.error("Erro ao criar template: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("feedback_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Template excluído!");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (error: any) {
      toast.error("Erro ao excluir template: " + error.message);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Usar Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Templates de Feedback</DialogTitle>
            <DialogDescription>
              Selecione um template para preencher automaticamente o feedback
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum template disponível</p>
                <p className="text-sm">Crie seu primeiro template!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group",
                      template.is_public ? "border-primary/30 bg-primary/5" : ""
                    )}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          {template.is_public && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Público
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {template.constructive_criticism.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTemplate(template);
                          }}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        {template.created_by === user?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Template</DialogTitle>
            <DialogDescription>
              Crie um template reutilizável para seus feedbacks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template *</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Feedback Padrão de Execução"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição</Label>
              <Input
                id="template-description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-criticism">Crítica Construtiva *</Label>
              <Textarea
                id="template-criticism"
                value={newTemplate.constructive_criticism}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, constructive_criticism: e.target.value }))}
                placeholder="Texto base para crítica construtiva"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-action">Plano de Ação *</Label>
              <Textarea
                id="template-action"
                value={newTemplate.action_plan}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, action_plan: e.target.value }))}
                placeholder="Texto base para plano de ação"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="template-public">Template Público</Label>
                <p className="text-xs text-muted-foreground">
                  Templates públicos ficam visíveis para toda a equipe
                </p>
              </div>
              <Switch
                id="template-public"
                checked={newTemplate.is_public}
                onCheckedChange={(checked) => setNewTemplate((prev) => ({ ...prev, is_public: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTemplate} disabled={saving}>
              {saving ? "Salvando..." : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
