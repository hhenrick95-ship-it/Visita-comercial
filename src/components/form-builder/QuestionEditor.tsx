import { useState, useEffect } from "react";
import { resolveQuestionImage } from "@/lib/questionImages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { ConditionalLogicEditor } from "./ConditionalLogicEditor";

interface QuestionEditorProps {
  questionId: string;
  displayOrder: number;
  onClose: () => void;
  sectionId: string;
  allQuestions: Array<{ id: string; label: string; question_type: string; options?: any; display_order: number; section_id?: string }>;
}

const questionTypes = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Área de Texto" },
  { value: "radio", label: "Radio Button" },
  { value: "multi_select", label: "Múltipla Escolha" },
  { value: "select", label: "Dropdown" },
  { value: "slider", label: "Slider" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Data" },
  { value: "image_upload", label: "Upload de Imagens" },
  { value: "team_select", label: "Seleção de Equipe" },
  { value: "vendor_select", label: "Seleção de RCA" },
  { value: "client_select", label: "Seleção de Cliente (base cadastral)" }
];

export function QuestionEditor({ questionId, displayOrder, onClose, sectionId, allQuestions }: QuestionEditorProps) {
  const [questionType, setQuestionType] = useState("text");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isChartMetric, setIsChartMetric] = useState(false);
  const [metricName, setMetricName] = useState("");
  const [conditionalLogic, setConditionalLogic] = useState<any>(null);
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sliderMin, setSliderMin] = useState(1);
  const [sliderMax, setSliderMax] = useState(5);
  const [sliderStep, setSliderStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  const loadQuestion = async () => {
    const { data, error } = await supabase
      .from("form_questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (error) {
      toast.error("Erro ao carregar pergunta");
      return;
    }

    setQuestionType(data.question_type);
    setLabel(data.label);
    setDescription(data.description || "");
    setPlaceholder(data.placeholder || "");
    setImageUrl((data as any).image_url || "");
    setIsRequired(data.is_required);
    setIsActive(data.is_active ?? true);
    setIsChartMetric(data.is_chart_metric);
    setMetricName(data.metric_name || "");
    setConditionalLogic(data.conditional_logic);

    if (data.options) {
      setOptions(data.options as Array<{ value: string; label: string }>);
    }

    if (data.slider_config) {
      const config = data.slider_config as { min: number; max: number; step: number };
      setSliderMin(config.min);
      setSliderMax(config.max);
      setSliderStep(config.step);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, { value: "", label: "" }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: "value" | "label", value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const handleSave = async () => {
    setSaving(true);

    const updateData: any = {
      question_type: questionType,
      label,
      description,
      placeholder,
      image_url: imageUrl || null,
      is_required: isRequired,
      is_active: isActive,
      is_chart_metric: isChartMetric,
      metric_name: isChartMetric ? metricName : null,
      conditional_logic: conditionalLogic
    };

    if (questionType === "radio" || questionType === "select" || questionType === "multi_select") {
      updateData.options = options;
    } else {
      updateData.options = null;
    }

    if (questionType === "slider") {
      updateData.slider_config = { min: sliderMin, max: sliderMax, step: sliderStep };
    } else {
      updateData.slider_config = null;
    }

    const { error } = await supabase
      .from("form_questions")
      .update(updateData)
      .eq("id", questionId);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar pergunta", { description: error.message });
    } else {
      toast.success("Pergunta atualizada com sucesso");
      onClose();
    }
  };

  // Apenas perguntas anteriores DA MESMA SEÇÃO podem ser usadas como
  // gatilho de lógica condicional (o runtime só avalia triggers da mesma seção).
  const availableQuestions = allQuestions.filter(
    q =>
      q.id !== questionId &&
      q.section_id === sectionId &&
      q.display_order < displayOrder
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pergunta</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="opcoes">Opções</TabsTrigger>
            <TabsTrigger value="condicional">Condicional</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div>
              <Label>Tipo de Pergunta</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Label *</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Texto da pergunta"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição ou instrução opcional"
              />
            </div>

            <div>
              <Label>Placeholder</Label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Texto de exemplo no campo"
              />
            </div>

            <div>
              <Label>Imagem da pergunta</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Ex: danone-liq-mor-850g ou https://..."
              />
              {resolveQuestionImage(imageUrl) && (
                <div className="mt-2 flex items-center justify-center rounded-lg border bg-muted/30 p-2">
                  <img src={resolveQuestionImage(imageUrl)!} alt="Pré-visualização" className="max-h-32 w-auto object-contain" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Campo obrigatório</Label>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Pergunta ativa</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {questionType === "team_select" && (
              <div>
                <Label>Filtrar por cargo</Label>
                <Select
                  value={(conditionalLogic?.role_filter as string) || "all"}
                  onValueChange={(value) =>
                    setConditionalLogic({
                      ...(conditionalLogic || {}),
                      role_filter: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos (Coord. / Gerente / Superv.)</SelectItem>
                    <SelectItem value="coordenador">Apenas Coordenadores</SelectItem>
                    <SelectItem value="gerente">Apenas Gerentes</SelectItem>
                    <SelectItem value="supervisor">Apenas Supervisores</SelectItem>
                    <SelectItem value="coordenador,gerente">Coordenadores e Gerentes</SelectItem>
                    <SelectItem value="gerente,supervisor">Gerentes e Supervisores</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Define quais cargos aparecem no dropdown desta pergunta.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="opcoes" className="space-y-4 mt-4">
            {(questionType === "radio" || questionType === "select" || questionType === "multi_select") ? (
              <div>
                <Label>Opções de Resposta</Label>
                <div className="space-y-2 mt-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Valor (id interno)"
                        value={option.value}
                        onChange={(e) => handleOptionChange(index, "value", e.target.value)}
                      />
                      <Input
                        placeholder="Label (exibido ao usuário)"
                        value={option.label}
                        onChange={(e) => handleOptionChange(index, "label", e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddOption}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Opção
                  </Button>
                </div>
              </div>
            ) : questionType === "slider" ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    value={sliderMin}
                    onChange={(e) => setSliderMin(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Valor Máximo</Label>
                  <Input
                    type="number"
                    value={sliderMax}
                    onChange={(e) => setSliderMax(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Passo</Label>
                  <Input
                    type="number"
                    value={sliderStep}
                    onChange={(e) => setSliderStep(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este tipo de pergunta não possui opções configuráveis.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="condicional" className="space-y-4 mt-4">
            <ConditionalLogicEditor
              value={conditionalLogic}
              onChange={setConditionalLogic}
              availableQuestions={availableQuestions}
            />
            {availableQuestions.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Não há perguntas anteriores disponíveis para criar condicionais.
                Adicione perguntas antes desta para habilitar lógica condicional.
              </p>
            )}
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Usar como métrica no dashboard</Label>
                <p className="text-sm text-muted-foreground">
                  Esta pergunta será exibida nos gráficos e KPIs
                </p>
              </div>
              <Switch checked={isChartMetric} onCheckedChange={setIsChartMetric} />
            </div>

            {isChartMetric && (
              <div>
                <Label>Nome da métrica *</Label>
                <Input
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="Nome para exibir no dashboard"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: "Nível de Relacionamento", "Taxa de Execução", etc.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
