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
import { Loader2, MapPin, ArrowLeft, CheckCircle2, FileText, Home as HomeIcon } from "lucide-react";
import { QuestionRenderer } from "./visit-form/QuestionRenderer";
import { FormNavigation } from "./visit-form/FormNavigation";
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
import type { FormTemplate } from "@/hooks/useFormTemplates";

interface FormSection {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  conditional_logic?: any;
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
  identification_role?: string | null;
}

interface DynamicFormProps {
  template: FormTemplate;
  onCancel?: () => void;
}

export function DynamicForm({ template }: DynamicFormProps) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"form" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geolocationStatus, setGeolocationStatus] = useState<"granted" | "denied" | "error" | "unavailable" | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const [allSections, setAllSections] = useState<FormSection[]>([]);
  const [questions, setQuestions] = useState<Record<string, FormQuestion[]>>({});
  const [loading, setLoading] = useState(true);
  const [formSchema, setFormSchema] = useState<z.ZodObject<any>>(z.object({}));
  const loadedTemplateIdRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const draftKey = `form-draft-${template.id}`;
  const draftRestoredRef = useRef(false);

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: "onTouched",
  });

  // Observa os valores para reavaliar seções condicionais (ex: fornecedor escolhido)
  const watchedValues = form.watch();

  const isSectionVisible = (s: FormSection, values?: any): boolean => {
    const cond = s.conditional_logic as { show_when?: { question_id: string; value: any } } | null;
    if (!cond?.show_when) return true;
    const v = (values ?? form.getValues())[`q_${cond.show_when.question_id}`];
    return v === cond.show_when.value;
  };

  const sections = allSections.filter((s) => isSectionVisible(s, watchedValues));

  useEffect(() => {
    if (sections.length > 0 && currentSection > sections.length - 1) {
      setCurrentSection(sections.length - 1);
    }
  }, [sections.length, currentSection]);

  const isFormDirty = screen === "form" && form.formState.isDirty;
  const { showDialog, confirmNavigation, cancelNavigation, checkBeforeNavigate, message } = useFormLeaveGuard({
    isDirty: isFormDirty && !submittedRef.current,
    message: "Você tem dados não salvos no formulário. Tem certeza que deseja sair?",
  });

  const handleBackHome = () => checkBeforeNavigate(() => navigate("/"));

  useEffect(() => {
    // Carrega a estrutura apenas uma vez por template.id, evitando que
    // re-renders durante o submit disparem reset() e percam respostas.
    if (!template?.id) return;
    if (loadedTemplateIdRef.current === template.id) return;
    loadedTemplateIdRef.current = template.id;
    loadStructure();
  }, [template?.id]);

  const loadStructure = async () => {
    setLoading(true);
    try {
      const sectionsClient: any = supabase.from("form_sections");
      const { data: sectionsData, error: sErr } = await sectionsClient
        .select("*")
        .eq("template_id", template.id)
        .eq("is_active", true)
        .order("display_order");
      if (sErr) throw sErr;

      // BLINDAGEM: filtra apenas seções do template atual (evita mistura).
      const safeSections = (sectionsData || []).filter(
        (s: any) => s.template_id === template.id
      );
      if (safeSections.length !== (sectionsData || []).length) {
        console.error("[DynamicForm] Seções fora do template detectadas e removidas.");
      }

      const sectionIds = safeSections.map((s: any) => s.id);
      const { data: questionsData, error: qErr } = await supabase
        .from("form_questions")
        .select("*")
        .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("is_active", true)
        .order("display_order");
      if (qErr) throw qErr;

      // BLINDAGEM: garante que cada pergunta pertence a uma seção do template.
      const sectionIdSet = new Set(sectionIds);
      const safeQuestions = (questionsData || []).filter((q: any) =>
        sectionIdSet.has(q.section_id)
      );

      setAllSections(safeSections as FormSection[]);

      const sectionCondMap: Record<string, boolean> = {};
      safeSections.forEach((s: any) => {
        sectionCondMap[s.id] = !!(s.conditional_logic && s.conditional_logic.show_when);
      });

      const grouped: Record<string, FormQuestion[]> = {};
      safeQuestions.forEach((q: any) => {
        if (!grouped[q.section_id]) grouped[q.section_id] = [];
        grouped[q.section_id].push(q);
      });
      setQuestions(grouped);

      // Schema dinâmico
      const fields: Record<string, any> = {};
      const defaults: Record<string, any> = {};
      safeQuestions.forEach((q: any) => {
        const key = `q_${q.id}`;
        const hasCond =
          !!(q.conditional_logic && (q.conditional_logic as any).show_when) ||
          !!sectionCondMap[q.section_id];
        const required = q.is_required && !hasCond;
        switch (q.question_type) {
          case "text":
          case "textarea":
            fields[key] = required
              ? z.string().min(1, `${q.label} é obrigatório`)
              : z.string().optional();
            defaults[key] = "";
            break;
          case "radio":
          case "select":
          case "team_select":
          case "vendor_select":
          case "client_select":
            fields[key] = required
              ? z.string().min(1, `${q.label} é obrigatório`)
              : z.string().optional();
            defaults[key] = "";
            break;
          case "slider": {
            const cfg = (q.slider_config as { min: number; max: number }) || { min: 1, max: 5 };
            fields[key] = required ? z.number().min(cfg.min).max(cfg.max) : z.number().optional();
            defaults[key] = Math.floor((cfg.min + cfg.max) / 2);
            break;
          }
          case "checkbox":
            fields[key] = z.boolean().optional();
            defaults[key] = false;
            break;
          case "date":
            fields[key] = required
              ? z.string().min(1, `${q.label} é obrigatório`)
              : z.string().optional();
            defaults[key] = new Date().toISOString().split("T")[0];
            break;
          case "image_upload":
            fields[key] = required
              ? z.array(z.string()).min(1, "Pelo menos uma imagem é necessária")
              : z.array(z.string()).optional();
            defaults[key] = [];
            break;
          case "multi_select":
            fields[key] = required
              ? z.array(z.string()).min(1, `${q.label} é obrigatório`)
              : z.array(z.string()).optional();
            defaults[key] = [];
            break;
          default:
            fields[key] = z.any().optional();
            defaults[key] = undefined;
        }
      });
      const dyn = z.object(fields);
      setFormSchema(dyn);
      // Só aplica defaults se o usuário ainda não interagiu com o formulário.
      // Isso impede que um re-render acidental zere as respostas.
      if (!form.formState.isDirty) {
        // Tenta restaurar rascunho salvo
        let restored: any = null;
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && parsed.values) {
              restored = parsed;
            }
          }
        } catch {}
        if (restored) {
          form.reset({ ...defaults, ...restored.values });
          if (typeof restored.section === "number" && restored.section < safeSections.length) {
            setCurrentSection(restored.section);
          }
          draftRestoredRef.current = true;
          toast.info("Rascunho restaurado", {
            description: "Continuamos de onde você parou.",
          });
        } else {
          form.reset(defaults);
        }
      }
    } catch (e: any) {
      toast.error("Erro ao carregar formulário", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Auto-save de rascunho em localStorage (defesa contra OOM/crash)
  useEffect(() => {
    if (loading) return;
    if (screen !== "form") return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const sub = form.watch((values) => {
      if (submittedRef.current) return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          localStorage.setItem(
            draftKey,
            JSON.stringify({ values, section: currentSection, ts: Date.now() })
          );
        } catch {}
      }, 500);
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      sub.unsubscribe();
    };
  }, [loading, screen, currentSection, draftKey, form]);

  // Geolocalização opcional
  useEffect(() => {
    if (!template.requires_geolocation) return;
    if (screen !== "form") return;
    if (!("geolocation" in navigator)) {
      setGeolocationStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeolocationStatus("granted");
      },
      (err) => {
        let s: "denied" | "error" | "unavailable" = "error";
        if (err.code === 1) s = "denied";
        else if (err.code === 2) s = "unavailable";
        setGeolocationStatus(s);
        setGeolocationError(err.message);
        toast.warning("Não foi possível obter a localização", {
          description: "O envio será registrado sem GPS.",
        });
      }
    );
  }, [screen, template.requires_geolocation]);

  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "DynamicForm/1.0" } }
      );
      const d = await r.json();
      return d.display_name || null;
    } catch {
      return null;
    }
  };

  // Extrai metadata baseado em identification_role
  const extractMetadata = (data: any): Record<string, any> => {
    const meta: Record<string, any> = {};
    Object.values(questions)
      .flat()
      .forEach((q) => {
        if (!q.identification_role) return;
        const v = data[`q_${q.id}`];
        if (v !== undefined && v !== null && v !== "") {
          meta[q.identification_role] = v;
        }
      });
    return meta;
  };

  const onSubmit = async (data: any) => {
    if (submittedRef.current) return;
    setIsSubmitting(true);
    try {
      let address: string | null = null;
      if (location) address = await reverseGeocode(location.latitude, location.longitude);

      const metadata = extractMetadata(data);

      const submissionsClient: any = supabase.from("form_submissions");
      const { data: subData, error: subError } = await submissionsClient
        .insert({
          template_id: template.id,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          address,
          geolocation_status: geolocationStatus,
          geolocation_error: geolocationError,
          metadata,
        })
        .select()
        .single();
      if (subError) throw subError;

      // Ignora respostas de perguntas/seções que não estavam visíveis
      const allQs = Object.values(questions).flat();
      const responses = Object.entries(data)
        .filter(([k]) => {
          const q = allQs.find((qq) => `q_${qq.id}` === k);
          return q ? isQuestionVisible(q) : true;
        })
        .map(([k, v]) => ({
          submission_id: subData.id,
          question_id: k.replace("q_", ""),
          response_value: v as any,
        }));
      const responsesClient: any = supabase.from("form_responses");
      const { error: rErr } = await responsesClient.insert(responses);
      if (rErr) throw rErr;

      setSubmittedId(subData.id);
      submittedRef.current = true;
      try { localStorage.removeItem(draftKey); } catch {}
      setScreen("success");
      toast.success("Formulário enviado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQuestionVisible = (q: FormQuestion): boolean => {
    const sec = allSections.find((s) => s.id === q.section_id);
    if (sec && !isSectionVisible(sec)) return false;
    const cond = q.conditional_logic as { show_when?: { question_id: string; value: any } } | null;
    if (!cond?.show_when) return true;
    const dep = form.getValues(`q_${cond.show_when.question_id}`);
    return dep === cond.show_when.value;
  };

  // Perguntas que precisam de validação manual: dependem de outra resposta
  // (na própria pergunta) ou estão em uma seção condicional.
  const needsManualValidation = (q: FormQuestion): boolean => {
    if (q.conditional_logic && (q.conditional_logic as any).show_when) return true;
    const sec = allSections.find((s) => s.id === q.section_id);
    return !!(sec?.conditional_logic && (sec.conditional_logic as any).show_when);
  };

  const validateCurrentSection = async () => {
    if (sections.length === 0) return true;
    const sec = sections[currentSection];
    const list = questions[sec.id] || [];
    const baseFields = list
      .filter((q) => q.is_required && !needsManualValidation(q))
      .map((q) => `q_${q.id}`);
    const baseValid = baseFields.length === 0 ? true : await form.trigger(baseFields);

    let condValid = true;
    list
      .filter((q) => q.is_required && needsManualValidation(q))
      .forEach((q) => {
        const k = `q_${q.id}`;
        if (!isQuestionVisible(q)) {
          form.clearErrors(k);
          return;
        }
        const v = form.getValues(k);
        let empty = false;
        switch (q.question_type) {
          case "image_upload":
            empty = !Array.isArray(v) || v.length === 0;
            break;
          case "slider":
            empty = v === undefined || v === null;
            break;
          case "checkbox":
            empty = !v;
            break;
          default:
            empty = v === undefined || v === null || v === "";
        }
        if (empty) {
          form.setError(k, { type: "manual", message: `${q.label} é obrigatório` });
          condValid = false;
        } else {
          form.clearErrors(k);
        }
      });
    return baseValid && condValid;
  };

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

  const handleNext = async () => {
    const ok = await validateCurrentSection();
    if (ok) setCurrentSection((p) => p + 1);
    else showMissingFieldsFeedback();
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting || submittedRef.current) return;
    Object.values(questions).flat().forEach((q) => {
      if (!isQuestionVisible(q)) form.clearErrors(`q_${q.id}`);
    });

    const ok = await validateCurrentSection();
    if (!ok) {
      showMissingFieldsFeedback();
      return;
    }
    await form.handleSubmit(onSubmit, (errors) => {
      // Erros em seções anteriores impediam o submit silenciosamente.
      // Encontramos a 1ª seção com pendência, navegamos até ela e mostramos feedback.
      const errorKeys = Object.keys(errors).filter((k) => k.startsWith("q_"));
      const allQuestions = Object.values(questions).flat();
      const firstMissing = errorKeys
        .map((k) => allQuestions.find((q) => `q_${q.id}` === k))
        .filter((q): q is FormQuestion => !!q && isQuestionVisible(q))[0];
      if (firstMissing) {
        const idx = sections.findIndex((s) => s.id === firstMissing.section_id);
        if (idx >= 0 && idx !== currentSection) setCurrentSection(idx);
      }
      showMissingFieldsFeedback();
      setIsSubmitting(false);
    })();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="glass-card border-0 max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Formulário em construção</CardTitle>
            <CardDescription>
              Este formulário ainda não tem seções ou perguntas configuradas. Peça ao administrador
              para finalizar a configuração.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} variant="outline" className="glass-card border-0">
              <HomeIcon className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "success") {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="glass-card border-0 max-w-xl mx-auto text-center">
          <CardHeader>
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Enviado com sucesso!</CardTitle>
            <CardDescription>Seu registro de "{template.name}" foi salvo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setScreen("form");
                setCurrentSection(0);
                form.reset();
                setSubmittedId(null);
              }}
              variant="outline"
              className="glass-card border-0"
            >
              <FileText className="h-4 w-4 mr-2" />
              Novo registro
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="bg-hero-gradient text-primary-foreground border-0"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSections = sections.length;
  const progress = totalSections > 0 ? ((currentSection + 1) / totalSections) * 100 : 0;

  return (
    <>
      <div className="relative min-h-[calc(100vh-4rem)] bg-mesh py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-hero-gradient bg-clip-text text-transparent">{template.name}</span>
            </h1>
            {template.description && (
              <p className="text-muted-foreground">{template.description}</p>
            )}
            {location && (
              <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Localização capturada</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackHome}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Button>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-hero-gradient transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Seção {currentSection + 1} de {totalSections}
            </p>
          </div>

          <Form {...form}>
            <div className="space-y-6">
              {sections[currentSection] && (
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>
                      Seção {currentSection + 1} — {sections[currentSection].title}
                    </CardTitle>
                    {sections[currentSection].description && (
                      <CardDescription>{sections[currentSection].description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-2 space-y-6">
                    {questions[sections[currentSection].id]?.map((q) => (
                      <QuestionRenderer
                        key={q.id}
                        question={q as any}
                        form={form}
                        sectionQuestions={questions[sections[currentSection].id] as any}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              <FormNavigation
                currentSection={currentSection}
                totalSections={totalSections}
                isSubmitting={isSubmitting}
                onPrevious={() => setCurrentSection((p) => p - 1)}
                onNext={handleNext}
                onSubmit={handleFinalSubmit}
              />
            </div>
          </Form>
        </div>
      </div>

      <AlertDialog open={showDialog} onOpenChange={cancelNavigation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do formulário?</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>Continuar preenchendo</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmNavigation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
