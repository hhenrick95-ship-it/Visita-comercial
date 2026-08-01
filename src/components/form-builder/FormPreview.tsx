import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { QuestionRenderer } from "@/components/visit-form/QuestionRenderer";
import { useForm } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormPreviewProps {
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    display_order: number;
    is_active: boolean;
  }>;
  questions: Record<string, Array<{
    id: string;
    section_id: string;
    question_type: string;
    label: string;
    description: string | null;
    placeholder: string | null;
    options: any;
    slider_config: any;
    is_required: boolean;
    is_active: boolean;
    display_order: number;
    conditional_logic: any;
  }>>;
  onClose: () => void;
}

export function FormPreview({ sections, questions, onClose }: FormPreviewProps) {
  const form = useForm({
    defaultValues: {}
  });

  const activeSections = sections.filter(s => s.is_active !== false);
  const activeQuestions = Object.entries(questions).reduce((acc, [sectionId, qs]) => {
    acc[sectionId] = qs.filter(q => q.is_active !== false);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Formulário</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <Form {...form}>
            <form className="space-y-8">
              {activeSections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">
                      {section.display_order}. {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <div className="space-y-4 pl-4">
                    {activeQuestions[section.id]?.map((question) => (
                      <QuestionRenderer
                        key={question.id}
                        question={question}
                        form={form}
                        sectionQuestions={activeQuestions[section.id]}
                      />
                    ))}
                    {(!activeQuestions[section.id] || activeQuestions[section.id].length === 0) && (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma pergunta ativa nesta seção
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Fechar Preview
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
