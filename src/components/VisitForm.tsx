import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MapPin, Clock, ArrowLeft } from "lucide-react";
import { generateVisitPDF } from "@/lib/generateVisitPDF";
import logoLopes from "@/assets/logo-lopes.png";
import { SuccessScreen } from "./visit-form/SuccessScreen";
import { QuestionRenderer } from "./visit-form/QuestionRenderer";
import { FormNavigation } from "./visit-form/FormNavigation";
import { normalizeManagerName, TeamMember } from "@/lib/normalizeManager";
import { useFormLeaveGuard } from "@/hooks/useFormLeaveGuard";
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
  display_order: number;
  conditional_logic: any;
}

export function VisitForm() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"intro" | "form" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geolocationStatus, setGeolocationStatus] = useState<"granted" | "denied" | "error" | "unavailable" | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [submittedVisitId, setSubmittedVisitId] = useState<string | null>(null);
  
  const [sections, setSections] = useState<FormSection[]>([]);
  const [questions, setQuestions] = useState<Record<string, FormQuestion[]>>({});
  const [loading, setLoading] = useState(true);
  const [formSchema, setFormSchema] = useState<z.ZodObject<any>>(z.object({}));
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const submittedRef = useRef(false);
  const structureLoadedRef = useRef(false);

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: "onTouched",
  });

  // Form leave guard - only active when on form screen and form is dirty
  const isFormDirty = screen === "form" && form.formState.isDirty;
  const { showDialog, confirmNavigation, cancelNavigation, checkBeforeNavigate, message } = useFormLeaveGuard({
    isDirty: isFormDirty && !submittedRef.current,
    message: "Você tem dados não salvos no formulário. Tem certeza que deseja sair?"
  });

  // Wrap navigation functions to check for unsaved changes
  const handleNavigateHome = () => {
    checkBeforeNavigate(() => navigate("/"));
  };

  useEffect(() => {
    if (structureLoadedRef.current) return;
    structureLoadedRef.current = true;
    loadFormStructure();
  }, []);

  const loadFormStructure = async () => {
    try {
      // Buscar o template "Visita Comercial" para filtrar apenas as suas seções/perguntas
      const templatesClient: any = supabase.from("form_templates");
      const { data: templateData, error: templateError } = await templatesClient
        .select("id")
        .eq("slug", "visita")
        .maybeSingle();
      if (templateError) throw templateError;
      const visitaTemplateId = templateData?.id as string | undefined;

      if (!visitaTemplateId) {
        toast.error("Template padrão não encontrado", {
          description: "Recarregue a página. Se persistir, contate o administrador.",
        });
        setLoading(false);
        return;
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from("form_sections")
        .select("*")
        .eq("template_id", visitaTemplateId)
        .eq("is_active", true)
        .order("display_order");

      if (sectionsError) throw sectionsError;

      // BLINDAGEM: garante que todas as seções pertencem ao template "visita".
      const safeSections = (sectionsData || []).filter(
        (s: any) => s.template_id === visitaTemplateId
      );
      if (safeSections.length !== (sectionsData || []).length) {
        console.error("[VisitForm] Seções fora do template detectadas e removidas.");
      }

      const sectionIds = safeSections.map((s: any) => s.id);
      const { data: questionsData, error: questionsError } = await supabase
        .from("form_questions")
        .select("*")
        .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("is_active", true)
        .order("display_order");

      if (questionsError) throw questionsError;

      // BLINDAGEM: garante que toda pergunta pertence a uma seção do template.
      const sectionIdSet = new Set(sectionIds);
      const safeQuestions = (questionsData || []).filter((q: any) =>
        sectionIdSet.has(q.section_id)
      );

      setSections(safeSections);

      const groupedQuestions: Record<string, FormQuestion[]> = {};
      safeQuestions.forEach((q) => {
        if (!groupedQuestions[q.section_id]) {
          groupedQuestions[q.section_id] = [];
        }
        groupedQuestions[q.section_id].push(q as any);
      });
      setQuestions(groupedQuestions);

      // Create dynamic schema
      const schemaFields: Record<string, any> = {};
      const defaultValues: Record<string, any> = {};

      safeQuestions.forEach((q) => {
        const fieldKey = `q_${q.id}`;
        // Se a pergunta tem lógica condicional (show_when), tratamos como opcional no schema
        // e validamos a obrigatoriedade manualmente em validateCurrentSection apenas quando
        // a condição estiver ativa.
        const hasConditional = !!(q.conditional_logic && (q.conditional_logic as any).show_when);
        const effectiveRequired = q.is_required && !hasConditional;

        switch (q.question_type) {
          case "text":
          case "textarea":
            schemaFields[fieldKey] = effectiveRequired
              ? z.string().min(1, `${q.label} é obrigatório`)
              : z.string().optional();
            defaultValues[fieldKey] = "";
            break;
          case "radio":
          case "select":
          case "team_select":
          case "vendor_select":
            if (effectiveRequired) {
              schemaFields[fieldKey] = z.string().min(1, `${q.label} é obrigatório`);
            } else {
              schemaFields[fieldKey] = z.string().optional();
            }
            defaultValues[fieldKey] = "";
            break;
          case "slider":
            const config = (q.slider_config as { min: number; max: number; step: number }) || { min: 1, max: 5, step: 1 };
            schemaFields[fieldKey] = effectiveRequired
              ? z.number().min(config.min).max(config.max)
              : z.number().optional();
            defaultValues[fieldKey] = Math.floor((config.min + config.max) / 2);
            break;
          case "checkbox":
            schemaFields[fieldKey] = z.boolean().optional();
            defaultValues[fieldKey] = false;
            break;
          case "date":
            schemaFields[fieldKey] = effectiveRequired
              ? z.string().min(1, `${q.label} é obrigatório`)
              : z.string().optional();
            defaultValues[fieldKey] = new Date().toISOString().split("T")[0];
            break;
          case "image_upload":
            schemaFields[fieldKey] = effectiveRequired
              ? z.array(z.string()).min(1, "Pelo menos uma imagem é necessária")
              : z.array(z.string()).optional();
            defaultValues[fieldKey] = [];
            break;
          case "multi_select":
            schemaFields[fieldKey] = effectiveRequired
              ? z.array(z.string()).min(1, `${q.label} é obrigatório`)
              : z.array(z.string()).optional();
            defaultValues[fieldKey] = [];
            break;
        }
      });

      const dynamicSchema = z.object(schemaFields);
      setFormSchema(dynamicSchema);

      // Não sobrescrever respostas em andamento: só aplica defaults se o
      // usuário ainda não interagiu com o formulário.
      if (!form.formState.isDirty) {
        form.reset(defaultValues);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar formulário", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (screen === "form" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGeolocationStatus("granted");
          setGeolocationError(null);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          let status: "denied" | "error" | "unavailable" = "error";
          if (error.code === 1) status = "denied";
          else if (error.code === 2) status = "unavailable";
          else if (error.code === 3) status = "error";
          setGeolocationStatus(status);
          setGeolocationError(error.message || `Código: ${error.code}`);
          if (status === "denied") {
            toast.warning("Localização negada", {
              description: "Sua visita será registrada SEM GPS. Esta ação ficará registrada para auditoria.",
              duration: 8000,
            });
          } else {
            toast.warning("Não foi possível obter a localização", {
              description: "A visita será registrada sem GPS. Verifique sinal/permissões.",
              duration: 6000,
            });
          }
        }
      );
    } else if (screen === "form" && !("geolocation" in navigator)) {
      setGeolocationStatus("unavailable");
      setGeolocationError("Geolocation API não disponível neste dispositivo");
    }
  }, [screen]);

  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'VisitForm/1.0'
          }
        }
      );
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error("Erro ao obter endereço:", error);
      return null;
    }
  };

  const onSubmit = async (data: any) => {
    if (submittedRef.current) return;
    setIsSubmitting(true);
    try {
      let address = null;
      if (location) {
        address = await reverseGeocode(location.latitude, location.longitude);
      }

      // Find identification fields from first section
      const firstSection = sections[0];
      const identificationQuestions = questions[firstSection?.id] || [];
      
      // Map form responses to get real values with labels
      let managerValue = "Não informado";
      let rcaValue = "Não informado";
      let clientCodeValue = "Não informado";
      let visitDateValue = new Date().toISOString().split("T")[0];
      
      // IDs conhecidos das perguntas de níveis e oportunidades
      const RELATIONSHIP_QUESTION_ID = "71d7e417-8b95-4099-8628-7bb90fe59750";
      const EXECUTION_QUESTION_ID = "b82275a9-ac19-4e40-a421-c653cdaebc49";
      const DELIVERY_QUESTION_ID = "5e22a3d9-3343-4788-9464-6ec192c9a9cf";
      const MIX_EXPANSION_QUESTION_ID = "ee5a95e7-5787-4e6a-99eb-b618e6eed9c8";
      const VISIBILITY_QUESTION_ID = "502f22c4-6ea6-4a96-9433-53fc2bc00ebf";
      
      // Valores padrão dos níveis e oportunidades
      let relationshipLevel = 3;
      let executionLevel = 3;
      let deliveryLevel = 3;
      let hasMixExpansion = false;
      let hasVisibilityImprovement = false;
      let mixExpansionDetails: string | null = null;
      let visibilityImprovementDetails: string | null = null;
      
      // Extrair valores de níveis e oportunidades das respostas
      for (const [key, value] of Object.entries(data)) {
        const questionId = key.replace("q_", "");
        
        // Níveis (sliders)
        if (questionId === RELATIONSHIP_QUESTION_ID) {
          relationshipLevel = Number(value) || 3;
        }
        if (questionId === EXECUTION_QUESTION_ID) {
          executionLevel = Number(value) || 3;
        }
        if (questionId === DELIVERY_QUESTION_ID) {
          deliveryLevel = Number(value) || 3;
        }
        
        // Oportunidades
        if (questionId === MIX_EXPANSION_QUESTION_ID) {
          hasMixExpansion = value === "sim";
        }
        if (questionId === VISIBILITY_QUESTION_ID) {
          hasVisibilityImprovement = value === "sim";
        }
      }
      
      // Buscar detalhes de oportunidades dinamicamente por label
      for (const section of sections) {
        const sectionQuestions = questions[section.id] || [];
        for (const q of sectionQuestions) {
          const fieldKey = `q_${q.id}`;
          const value = data[fieldKey];
          
          if (q.label.toLowerCase().includes("detalhes") && q.label.toLowerCase().includes("mix")) {
            mixExpansionDetails = value || null;
          }
          if (q.label.toLowerCase().includes("detalhes") && q.label.toLowerCase().includes("visibilidade")) {
            visibilityImprovementDetails = value || null;
          }
        }
      }
      
      for (const question of identificationQuestions) {
        const fieldKey = `q_${question.id}`;
        const responseValue = data[fieldKey];
        
        // Check based on question label to identify the field purpose
        if (question.label.toLowerCase().includes("data")) {
          visitDateValue = responseValue || visitDateValue;
        } else if (question.label.toLowerCase().includes("gestor") || question.question_type === "team_select") {
          // For team_select, fetch the member data and build full formatted name
          if (responseValue && question.question_type === "team_select") {
            const { data: memberData } = await supabase
              .from("teams_vendors")
              .select("nome_equipe, nome_rca, cargo")
              .eq("cod_rca_lopes", responseValue)
              .limit(1)
              .single();
            
            if (memberData) {
              const cargoLabel = memberData.cargo === "coordenador" ? "Coordenador" : memberData.cargo === "gerente" ? "Gerente" : "Supervisor";
              // Extrair nome limpo do nome_rca removendo prefixo "X - "
              const cleanRcaName = (memberData.nome_rca || '').replace(/^\w+\s*-\s*/i, '').trim();
              // Extrair apenas "EQUIPE X" do nome_equipe
              const teamPrefix = memberData.nome_equipe.trim().match(/^(EQUIPE\s+\w+)/i)?.[1] || memberData.nome_equipe.trim();
              managerValue = `${teamPrefix} - ${cleanRcaName} (${cargoLabel})`;
            } else {
              // Fallback: fetch all team members and use normalizeManagerName
              const { data: allMembers } = await supabase
                .from("teams_vendors")
                .select("cod_rca_lopes, nome_rca, nome_equipe, cargo")
                .in("cargo", ["coordenador", "gerente", "supervisor"]);
              
              managerValue = normalizeManagerName(responseValue, allMembers as TeamMember[] || []);
              console.warn("Manager não encontrado diretamente, usando normalização:", responseValue, "->", managerValue);
            }
          } else {
            managerValue = responseValue || managerValue;
          }
        } else if (question.label.toLowerCase().includes("rca") || question.label.toLowerCase().includes("vendedor") || question.question_type === "vendor_select") {
          // For vendor_select, fetch the vendor name
          if (responseValue && question.question_type === "vendor_select") {
            const { data: vendorData } = await supabase
              .from("teams_vendors")
              .select("nome_rca")
              .eq("cod_rca_lopes", responseValue)
              .limit(1)
              .single();
            rcaValue = vendorData?.nome_rca || responseValue;
          } else {
            rcaValue = responseValue || rcaValue;
          }
        } else if (question.label.toLowerCase().includes("cliente") || question.label.toLowerCase().includes("código")) {
          clientCodeValue = responseValue || clientCodeValue;
        }
      }

      // Validação final: impedir códigos numéricos puros como manager
      if (/^\d+$/.test(managerValue)) {
        console.error("Tentativa de salvar código numérico como manager:", managerValue);
        toast.error("Erro: Gestor não encontrado no sistema. Por favor, selecione novamente.");
        setIsSubmitting(false);
        return;
      }

      const { data: visitData, error: visitError } = await supabase
        .from("visit_forms")
        .insert({
          visit_date: visitDateValue,
          manager: managerValue,
          rca_accompanied: rcaValue,
          client_code: clientCodeValue,
          latitude: location?.latitude,
          longitude: location?.longitude,
          address: address,
          geolocation_status: geolocationStatus,
          geolocation_error: geolocationError,
          prices_visible_correct: true,
          has_activation_promotion: false,
          has_merchandising_material: false,
          has_promotional_gift: false,
          adequate_assortment_available: true,
          vendor_follows_visit_frequency: true,
          vendor_applied_positivation: true,
          relationship_level: relationshipLevel,
          execution_level: executionLevel,
          delivery_level: deliveryLevel,
          has_mix_expansion_opportunities: hasMixExpansion,
          has_visibility_improvement_opportunities: hasVisibilityImprovement,
          mix_expansion_details: mixExpansionDetails,
          visibility_improvement_details: visibilityImprovementDetails,
        })
        .select()
        .single();

      if (visitError) throw visitError;

      const responses = Object.entries(data).map(([key, value]) => {
        const questionId = key.replace("q_", "");
        return {
          visit_form_id: visitData.id,
          question_id: questionId,
          response_value: value as any
        };
      });

      const { error: responsesError } = await supabase
        .from("form_responses")
        .insert(responses as any);

      if (responsesError) throw responsesError;

      setSubmittedVisitId(visitData.id);
      setFormResponses(data);
      submittedRef.current = true;
      setScreen("success");
      toast.success("Formulário enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar formulário", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePDF = async () => {
    if (!submittedVisitId) {
      toast.error("Erro ao gerar PDF: ID da visita não encontrado");
      return;
    }
    
    try {
      await generateVisitPDF(submittedVisitId);
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar PDF: " + error.message);
    }
  };

  const handleNewForm = () => {
    setScreen("form");
    setCurrentSection(0);
    setFormResponses({});
    setLocation(null);
    submittedRef.current = false;
    form.reset();
  };

  // Conditional questions are only required when their condition is active.
  const isQuestionVisible = (q: FormQuestion): boolean => {
    const cond = q.conditional_logic as { show_when?: { question_id: string; value: any } } | null;
    if (!cond?.show_when) return true;
    const dependentValue = form.getValues(`q_${cond.show_when.question_id}`);
    return dependentValue === cond.show_when.value;
  };

  const validateCurrentSection = async () => {
    if (sections.length === 0) return true;
    
    const currentSectionData = sections[currentSection];
    const sectionQuestions = questions[currentSectionData.id] || [];

    // Validação base via Zod (para campos required SEM condicional)
    const fieldsToValidate = sectionQuestions
      .filter(q => q.is_required && !(q.conditional_logic && (q.conditional_logic as any).show_when))
      .map(q => `q_${q.id}`);
    const baseValid = fieldsToValidate.length === 0 ? true : await form.trigger(fieldsToValidate);

    // Validação manual para campos required COM condicional: só obrigatórios se visíveis
    let conditionalValid = true;
    sectionQuestions
      .filter(q => q.is_required && q.conditional_logic && (q.conditional_logic as any).show_when)
      .forEach(q => {
        const fieldKey = `q_${q.id}`;
        if (!isQuestionVisible(q)) {
          // Pergunta escondida -> limpar qualquer erro pendente
          form.clearErrors(fieldKey);
          return;
        }
        const value = form.getValues(fieldKey);
        let isEmpty = false;
        switch (q.question_type) {
          case "image_upload":
            isEmpty = !Array.isArray(value) || value.length === 0;
            break;
          case "slider":
            isEmpty = value === undefined || value === null;
            break;
          case "checkbox":
            isEmpty = !value;
            break;
          default:
            isEmpty = value === undefined || value === null || value === "";
        }
        if (isEmpty) {
          form.setError(fieldKey, {
            type: "manual",
            message: q.question_type === "image_upload"
              ? "Pelo menos uma imagem é necessária"
              : `${q.label} é obrigatório`,
          });
          conditionalValid = false;
        } else {
          form.clearErrors(fieldKey);
        }
      });

    return baseValid && conditionalValid;
  };

  // Helper: build a label that includes the parent question when the field is conditional
  const getQuestionLabelWithContext = (q: FormQuestion): string => {
    const cond = q.conditional_logic as { show_when?: { question_id: string; value: any } } | null;
    if (cond?.show_when) {
      const parent = Object.values(questions).flat().find(
        (p) => p.id === cond.show_when!.question_id
      );
      if (parent) return `${parent.label} → ${q.label}`;
    }
    return q.label;
  };

  // Show toast listing missing fields and scroll to the first one
  const showMissingFieldsFeedback = () => {
    const errors = form.formState.errors as Record<string, any>;
    const errorKeys = Object.keys(errors).filter((k) => k.startsWith("q_"));
    const allQuestions = Object.values(questions).flat();
    const missing = errorKeys
      .map((k) => {
        const id = k.replace("q_", "");
        const q = allQuestions.find((qq) => qq.id === id);
        if (q && !isQuestionVisible(q)) {
          form.clearErrors(k);
          return null;
        }
        return q ? { id, label: getQuestionLabelWithContext(q) } : null;
      })
      .filter(Boolean) as { id: string; label: string }[];

    if (missing.length === 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const visible = missing.slice(0, 5).map((m) => `• ${m.label}`).join("\n");
    const extra = missing.length > 5 ? `\n…e mais ${missing.length - 5}` : "";
    toast.error("Campos obrigatórios faltando", {
      description: `${visible}${extra}`,
      duration: 6000,
    });

    // Scroll to first invalid question and highlight
    const firstId = missing[0].id;
    setTimeout(() => {
      const el = document.querySelector(`[data-question-id="${firstId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-destructive", "rounded-md", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-destructive", "rounded-md", "transition-all");
        }, 2000);
      }
    }, 50);
  };

  const handleNextSection = async () => {
    const isValid = await validateCurrentSection();
    if (isValid) {
      setCurrentSection((prev) => prev + 1);
    } else {
      showMissingFieldsFeedback();
    }
  };

  const validateAllConditionalRequired = (): boolean => {
    let allValid = true;
    Object.values(questions).flat().forEach(q => {
      if (!q.is_required) return;
      const cond = q.conditional_logic as { show_when?: { question_id: string; value: any } } | null;
      if (!cond?.show_when) return;
      const fieldKey = `q_${q.id}`;
      const dependentValue = form.getValues(`q_${cond.show_when.question_id}`);
      const isVisible = dependentValue === cond.show_when.value;
      if (!isVisible) {
        form.clearErrors(fieldKey);
        return;
      }
      const value = form.getValues(fieldKey);
      let isEmpty = false;
      switch (q.question_type) {
        case "image_upload":
          isEmpty = !Array.isArray(value) || value.length === 0;
          break;
        case "slider":
          isEmpty = value === undefined || value === null;
          break;
        case "checkbox":
          isEmpty = !value;
          break;
        default:
          isEmpty = value === undefined || value === null || value === "";
      }
      if (isEmpty) {
        form.setError(fieldKey, {
          type: "manual",
          message: q.question_type === "image_upload"
            ? "Pelo menos uma imagem é necessária"
            : `${q.label} é obrigatório`,
        });
        allValid = false;
      } else {
        form.clearErrors(fieldKey);
      }
    });
    return allValid;
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting || submittedRef.current) return;
    const conditionalValid = validateAllConditionalRequired();
    if (!conditionalValid) {
      showMissingFieldsFeedback();
      return;
    }
    await form.handleSubmit(onSubmit)();
  };

  if (screen === "success") {
    return (
      <SuccessScreen
        onGeneratePDF={generatePDF}
        onNavigateToFeedback={() => navigate(`/feedback/${submittedVisitId}`)}
        onNewForm={handleNewForm}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSections = sections.length;
  const progress = totalSections > 0 ? ((currentSection + 1) / totalSections) * 100 : 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <img src={logoLopes} alt="Lopes Distribuidora" className="mx-auto w-32 h-auto mb-6" />
            <h1 className="text-4xl font-bold text-primary mb-2">Acompanhamento de Visita</h1>
            <p className="text-muted-foreground">Preencha todos os campos obrigatórios</p>
            {location && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                <span>Localização capturada</span>
                <Clock className="h-4 w-4 text-secondary ml-4" />
                <span>{new Date().toLocaleString("pt-BR")}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleNavigateHome}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Button>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Seção {currentSection + 1} de {totalSections}
            </p>
          </div>

          <Form {...form}>
            <div 
              className="space-y-6"
            >
              {sections[currentSection] && (
                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-form-section">
                    <CardTitle className="text-primary">
                      Seção {currentSection + 1} — {sections[currentSection].title}
                    </CardTitle>
                    {sections[currentSection].description && (
                      <CardDescription>{sections[currentSection].description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {questions[sections[currentSection].id]?.map((question) => (
                      <QuestionRenderer
                        key={question.id}
                        question={question}
                        form={form}
                        sectionQuestions={questions[sections[currentSection].id]}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              <FormNavigation
                currentSection={currentSection}
                totalSections={totalSections}
                isSubmitting={isSubmitting}
                onPrevious={() => setCurrentSection((prev) => prev - 1)}
                onNext={handleNextSection}
                onSubmit={handleFinalSubmit}
              />
            </div>
          </Form>
        </div>
      </div>

      {/* Dialog de confirmação ao sair */}
      <AlertDialog open={showDialog} onOpenChange={cancelNavigation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              {message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>Continuar preenchendo</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
