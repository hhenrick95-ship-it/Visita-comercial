import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SectionEditorProps {
  sectionId: string;
  onClose: () => void;
}

export function SectionEditor({ sectionId, onClose }: SectionEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSection();
  }, [sectionId]);

  const loadSection = async () => {
    const { data, error } = await supabase
      .from("form_sections")
      .select("*")
      .eq("id", sectionId)
      .single();

    if (error) {
      toast.error("Erro ao carregar seção");
      return;
    }

    setTitle(data.title);
    setDescription(data.description || "");
    setIsActive(data.is_active);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("form_sections")
      .update({
        title,
        description,
        is_active: isActive
      })
      .eq("id", sectionId);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar seção", { description: error.message });
    } else {
      toast.success("Seção atualizada com sucesso");
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Seção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da seção"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Seção ativa</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
