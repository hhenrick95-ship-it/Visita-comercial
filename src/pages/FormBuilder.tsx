import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Plus, GripVertical, Eye, Trash2, Copy, ChevronUp, ChevronDown, GitBranch, EyeOff, Settings as SettingsIcon, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { SectionEditor } from "@/components/form-builder/SectionEditor";
import { QuestionEditor } from "@/components/form-builder/QuestionEditor";
import { CreateQuestionDialog } from "@/components/form-builder/CreateQuestionDialog";
import { FormPreview } from "@/components/form-builder/FormPreview";
import { PageHeader } from "@/components/PageHeader";
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

interface FormSection {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface FormQuestion {
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
  is_chart_metric: boolean;
  metric_name: string | null;
  conditional_logic: any;
}

export default function FormBuilder() {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const [templateName, setTemplateName] = useState<string>("");
  const [sections, setSections] = useState<FormSection[]>([]);
  const [questions, setQuestions] = useState<Record<string, FormQuestion[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ id: string; sectionId: string; displayOrder: number } | null>(null);
  const [creatingQuestionInSection, setCreatingQuestionInSection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

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
      toast.error("Erro ao baixar modelo", { description: e?.message || "Tente novamente" });
    }
  };

  useEffect(() => {
    if (templateId) {
      loadFormData();
      loadTemplateName();
    }
  }, [templateId]);

  const loadTemplateName = async () => {
    if (!templateId) return;
    const { data } = await supabase
      .from("form_templates" as any)
      .select("name")
      .eq("id", templateId)
      .maybeSingle();
    setTemplateName((data as any)?.name || "");
  };

  const loadFormData = async () => {
    try {
      const sectionsClient: any = supabase.from("form_sections");
      const { data: sectionsData, error: sectionsError } = await sectionsClient
        .select("*")
        .eq("template_id", templateId)
        .order("display_order");

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      const sectionIds = (sectionsData || []).map((s: any) => s.id);
      const { data: questionsData, error: questionsError } = await supabase
        .from("form_questions")
        .select("*")
        .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
        .order("display_order");

      if (questionsError) throw questionsError;

      const groupedQuestions: Record<string, FormQuestion[]> = {};
      questionsData?.forEach((q) => {
        if (!groupedQuestions[q.section_id]) {
          groupedQuestions[q.section_id] = [];
        }
        groupedQuestions[q.section_id].push(q);
      });
      setQuestions(groupedQuestions);
    } catch (error: any) {
      toast.error("Erro ao carregar formulário", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async () => {
    const maxOrder = Math.max(...sections.map(s => s.display_order), 0);
    const sectionsClient: any = supabase.from("form_sections");
    const { error } = await sectionsClient.insert({
      title: "Nova Seção",
      description: "",
      display_order: maxOrder + 1,
      is_active: true,
      template_id: templateId,
    });

    if (error) {
      toast.error("Erro ao criar seção", { description: error.message });
    } else {
      toast.success("Seção criada com sucesso");
      loadFormData();
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta seção? Todas as perguntas serão excluídas também.")) return;

    const { error } = await supabase
      .from("form_sections")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir seção", { description: error.message });
    } else {
      toast.success("Seção excluída com sucesso");
      loadFormData();
    }
  };

  const handleMoveSection = async (id: string, direction: "up" | "down") => {
    const index = sections.findIndex(s => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) return;

    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    const updates = newSections.map((s, i) => ({
      id: s.id,
      display_order: i + 1
    }));

    for (const update of updates) {
      await supabase
        .from("form_sections")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    loadFormData();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from("form_questions")
      .delete()
      .eq("id", questionId);

    setDeletingQuestion(null);

    if (error) {
      toast.error("Erro ao excluir pergunta", { description: error.message });
    } else {
      toast.success("Pergunta excluída com sucesso");
      loadFormData();
    }
  };

  const handleDuplicateQuestion = async (questionId: string, sectionId: string) => {
    const originalQuestion = questions[sectionId]?.find(q => q.id === questionId);
    if (!originalQuestion) return;

    const maxOrder = Math.max(...(questions[sectionId]?.map(q => q.display_order) || [0]), 0);

    const { id, created_at, updated_at, ...questionData } = originalQuestion as any;
    
    const { error } = await supabase
      .from("form_questions")
      .insert({
        ...questionData,
        label: `${questionData.label} (Cópia)`,
        display_order: maxOrder + 1
      });

    if (error) {
      toast.error("Erro ao duplicar pergunta", { description: error.message });
    } else {
      toast.success("Pergunta duplicada com sucesso");
      loadFormData();
    }
  };

  const handleMoveQuestion = async (questionId: string, sectionId: string, direction: "up" | "down") => {
    const sectionQuestions = questions[sectionId] || [];
    const index = sectionQuestions.findIndex(q => q.id === questionId);
    
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sectionQuestions.length - 1)
    ) return;

    const newQuestions = [...sectionQuestions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];

    const updates = newQuestions.map((q, i) => ({
      id: q.id,
      display_order: i + 1
    }));

    for (const update of updates) {
      await supabase
        .from("form_questions")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    loadFormData();
  };

  const getQuestionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      text: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      textarea: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20",
      radio: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
      select: "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20",
      slider: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
      checkbox: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      date: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
      image_upload: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      team_select: "bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20",
      vendor_select: "bg-teal-500/10 text-teal-500 hover:bg-teal-500/20"
    };
    return colors[type] || "bg-gray-500/10 text-gray-500";
  };

  const allQuestions = Object.values(questions).flat();

  const visibleSections = showInactive
    ? sections
    : sections.filter((s) => s.is_active !== false);

  const getVisibleQuestions = (sectionId: string) => {
    const list = questions[sectionId] || [];
    return showInactive ? list : list.filter((q) => q.is_active !== false);
  };

  const inactiveSectionsCount = sections.filter((s) => s.is_active === false).length;
  const inactiveQuestionsCount = allQuestions.filter((q) => q.is_active === false).length;

  if (!templateId) {
    return <Navigate to="/form-builder" replace />;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/form-builder")}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Todos os formulários
          </Button>
          <PageHeader
            icon={SettingsIcon}
            title={templateName || "Construtor de Formulário"}
            description="Gerencie seções e perguntas deste formulário"
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={handleDownloadBlankModel}
                  className="glass-card border-0"
                  title="Baixa um modelo Excel em branco para criar um novo formulário"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar modelo
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(true)} className="glass-card border-0">
                  <Eye className="mr-2 h-4 w-4" />
                  Pré-visualizar
                </Button>
                <Button onClick={handleCreateSection} className="bg-hero-gradient text-primary-foreground border-0 shadow-md hover:opacity-95">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Seção
                </Button>
              </>
            }
          />
        </div>

        <div className="flex items-center justify-end gap-3 mb-4 p-3 rounded-lg border bg-muted/30">
          <EyeOff className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
            Mostrar inativos
            {(inactiveSectionsCount > 0 || inactiveQuestionsCount > 0) && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({inactiveSectionsCount} seç. / {inactiveQuestionsCount} perg.)
              </span>
            )}
          </Label>
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
        </div>

        <div className="space-y-6">
          {visibleSections.map((section, index) => (
            <Card key={section.id} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveSection(section.id, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveSection(section.id, "down")}
                      disabled={index === visibleSections.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">
                        {section.display_order}. {section.title}
                      </CardTitle>
                      {!section.is_active && (
                        <Badge variant="secondary" className="text-xs">Inativa</Badge>
                      )}
                    </div>
                    {section.description && (
                      <CardDescription className="mt-1">
                        {section.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSection(section.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSection(section.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getVisibleQuestions(section.id).map((question, qIndex) => (
                    <div
                      key={question.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        question.is_active ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveQuestion(question.id, section.id, "up")}
                            disabled={qIndex === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveQuestion(question.id, section.id, "down")}
                            disabled={qIndex === getVisibleQuestions(section.id).length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground font-mono">
                          #{question.display_order}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{question.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getQuestionTypeBadge(question.question_type)}>
                              {question.question_type}
                            </Badge>
                            {question.is_required && (
                              <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                            )}
                            {question.is_chart_metric && (
                              <Badge variant="outline" className="text-xs bg-primary/10">Métrica</Badge>
                            )}
                            {question.conditional_logic && (
                              <Badge variant="outline" className="text-xs">
                                <GitBranch className="h-3 w-3 mr-1" />
                                Condicional
                              </Badge>
                            )}
                            {!question.is_active && (
                              <Badge variant="secondary" className="text-xs">Inativa</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingQuestion({ 
                            id: question.id, 
                            sectionId: section.id,
                            displayOrder: question.display_order 
                          })}
                        >
                          ⚙️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateQuestion(question.id, section.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setCreatingQuestionInSection(section.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Pergunta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {editingSection && (
          <SectionEditor
            sectionId={editingSection}
            onClose={() => {
              setEditingSection(null);
              loadFormData();
            }}
          />
        )}

        {editingQuestion && (
          <QuestionEditor
            questionId={editingQuestion.id}
            displayOrder={editingQuestion.displayOrder}
            sectionId={editingQuestion.sectionId}
            allQuestions={allQuestions}
            onClose={() => {
              setEditingQuestion(null);
              loadFormData();
            }}
          />
        )}

        {creatingQuestionInSection && (
          <CreateQuestionDialog
            sectionId={creatingQuestionInSection}
            currentMaxOrder={Math.max(...(questions[creatingQuestionInSection]?.map(q => q.display_order) || [0]), 0)}
            onClose={() => setCreatingQuestionInSection(null)}
            onSuccess={loadFormData}
          />
        )}

        {showPreview && (
          <FormPreview
            sections={sections}
            questions={questions}
            onClose={() => setShowPreview(false)}
          />
        )}

        <AlertDialog open={!!deletingQuestion} onOpenChange={() => setDeletingQuestion(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Pergunta</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.
                Todas as respostas associadas a esta pergunta serão mantidas no banco de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingQuestion && handleDeleteQuestion(deletingQuestion)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
