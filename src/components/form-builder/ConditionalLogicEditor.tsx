import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ConditionalLogicEditorProps {
  value: any;
  onChange: (value: any) => void;
  availableQuestions: Array<{ id: string; label: string; question_type: string; options?: any; section_id?: string }>;
}

const operators = [
  { value: "equals", label: "Igual a" },
  { value: "not_equals", label: "Diferente de" },
  { value: "contains", label: "Contém" },
  { value: "greater_than", label: "Maior que" },
  { value: "less_than", label: "Menor que" }
];

export function ConditionalLogicEditor({ value, onChange, availableQuestions }: ConditionalLogicEditorProps) {
  const hasCondition = value?.show_when;
  const selectedQuestionId = hasCondition ? value.show_when.question_id : "";
  const selectedQuestion = availableQuestions.find(q => q.id === selectedQuestionId);

  // Group questions by section for better organization
  const groupedQuestions = availableQuestions.reduce((acc, q) => {
    const sectionId = q.section_id || "other";
    if (!acc[sectionId]) acc[sectionId] = [];
    acc[sectionId].push(q);
    return acc;
  }, {} as Record<string, typeof availableQuestions>);

  const handleAddCondition = () => {
    onChange({
      ...(value || {}),
      show_when: {
        question_id: "",
        operator: "equals",
        value: ""
      }
    });
  };

  const handleRemoveCondition = () => {
    if (!value) {
      onChange(null);
      return;
    }
    // Preserva chaves técnicas (role_filter, team_question_id, etc.)
    const { show_when, ...rest } = value;
    onChange(Object.keys(rest).length > 0 ? rest : null);
  };

  const handleUpdateCondition = (field: string, newValue: any) => {
    onChange({
      ...(value || {}),
      show_when: {
        ...(value?.show_when || {}),
        [field]: newValue
      }
    });
  };

  if (!hasCondition) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Lógica Condicional</Label>
            <p className="text-sm text-muted-foreground">
              Mostrar esta pergunta apenas quando uma condição for satisfeita
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddCondition}>
            Adicionar Condição
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <Label>Condição de Exibição</Label>
        <Button variant="ghost" size="sm" onClick={handleRemoveCondition}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Mostrar quando</Label>
          <Select
            value={selectedQuestionId}
            onValueChange={(val) => handleUpdateCondition("question_id", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma pergunta" />
            </SelectTrigger>
            <SelectContent className="z-[100] max-h-[300px]">
              {availableQuestions.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhuma pergunta anterior disponível nesta seção
                </div>
              ) : (
                availableQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    <div className="flex flex-col">
                      <span>{q.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {q.question_type === "radio" && "Múltipla escolha"}
                        {q.question_type === "select" && "Seleção"}
                        {q.question_type === "multi_select" && "Múltipla seleção"}
                        {q.question_type === "text" && "Texto"}
                        {q.question_type === "checkbox" && "Caixas de seleção"}
                        {q.question_type === "slider" && "Escala"}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Operador</Label>
          <Select
            value={value.show_when.operator || "equals"}
            onValueChange={(val) => handleUpdateCondition("operator", val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Valor</Label>
          {selectedQuestion && (selectedQuestion.question_type === "radio" || selectedQuestion.question_type === "select") && selectedQuestion.options ? (
            <Select
              value={value.show_when.value}
              onValueChange={(val) => handleUpdateCondition("value", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um valor" />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-[300px]">
                {selectedQuestion.options.map((opt: any) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={value.show_when.value || ""}
              onChange={(e) => handleUpdateCondition("value", e.target.value)}
              placeholder="Digite o valor esperado"
            />
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Esta pergunta será exibida apenas quando a condição acima for verdadeira.
      </p>
    </div>
  );
}
