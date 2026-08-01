import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Type, 
  AlignLeft, 
  CircleDot, 
  ChevronDown, 
  Sliders, 
  CheckSquare, 
  Calendar, 
  Image,
  Users,
  UserCheck,
  Store,
  ListChecks
} from "lucide-react";

interface CreateQuestionDialogProps {
  sectionId: string;
  onClose: () => void;
  onSuccess: () => void;
  currentMaxOrder: number;
}

const questionTypes = [
  { value: "text", label: "Texto", icon: Type, description: "Campo de texto curto" },
  { value: "textarea", label: "Área de Texto", icon: AlignLeft, description: "Campo de texto longo" },
  { value: "radio", label: "Radio Button", icon: CircleDot, description: "Seleção única entre opções" },
  { value: "multi_select", label: "Múltipla Escolha", icon: ListChecks, description: "Seleção de várias opções entre uma lista" },
  { value: "select", label: "Dropdown", icon: ChevronDown, description: "Lista suspensa de opções" },
  { value: "slider", label: "Slider", icon: Sliders, description: "Escala numérica deslizante" },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Caixa de seleção sim/não" },
  { value: "date", label: "Data", icon: Calendar, description: "Seletor de data" },
  { value: "image_upload", label: "Upload de Imagens", icon: Image, description: "Upload múltiplo de imagens" },
  { value: "team_select", label: "Seleção de Equipe", icon: Users, description: "Dropdown dinâmico de equipes" },
  { value: "vendor_select", label: "Seleção de RCA", icon: UserCheck, description: "Dropdown dinâmico de RCAs filtrado por equipe" },
  { value: "client_select", label: "Seleção de Cliente", icon: Store, description: "Busca na base cadastral de clientes (razão social, fantasia, CNPJ ou código)" }
];

export function CreateQuestionDialog({ sectionId, onClose, onSuccess, currentMaxOrder }: CreateQuestionDialogProps) {
  const [creating, setCreating] = useState(false);

  const handleCreateQuestion = async (questionType: string) => {
    setCreating(true);

    const defaultData: any = {
      section_id: sectionId,
      question_type: questionType,
      label: "Nova Pergunta",
      description: "",
      placeholder: "",
      is_required: false,
      is_active: true,
      is_chart_metric: false,
      display_order: currentMaxOrder + 1
    };

    // Add default options for radio/select types
    if (questionType === "radio" || questionType === "select" || questionType === "multi_select") {
      defaultData.options = [
        { value: "opcao1", label: "Opção 1" },
        { value: "opcao2", label: "Opção 2" }
      ];
    }

    // Add default slider config
    if (questionType === "slider") {
      defaultData.slider_config = { min: 1, max: 5, step: 1 };
    }

    const { error } = await supabase
      .from("form_questions")
      .insert(defaultData);

    setCreating(false);

    if (error) {
      toast.error("Erro ao criar pergunta", { description: error.message });
    } else {
      toast.success("Pergunta criada com sucesso");
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Pergunta</DialogTitle>
          <DialogDescription>
            Selecione o tipo de pergunta que deseja adicionar
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {questionTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent hover:border-primary"
                onClick={() => handleCreateQuestion(type.value)}
                disabled={creating}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-5 w-5" />
                  <span className="font-semibold">{type.label}</span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  {type.description}
                </p>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
