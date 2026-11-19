import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Settings2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FOTOS_AJINOMOTO_SLUG } from "@/lib/restrictedFormAccess";
import { toast } from "sonner";

type QuestionDefinition = {
  label: string;
  question_type: string;
  description: string;
  placeholder: string | null;
  is_required: boolean;
  options: Array<{ value: string; label: string }> | null;
  slider_config: Record<string, unknown> | null;
  conditional_logic: Record<string, unknown> | null;
  display_order: number;
  identification_role: string | null;
};

export default function SetupFotosAjinomoto() {
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const configure = async () => {
    setSaving(true);
    try {
      const templates: any = supabase.from("form_templates" as any);
      let { data: template, error: findTemplateError } = await templates
        .select("id")
        .eq("slug", FOTOS_AJINOMOTO_SLUG)
        .maybeSingle();
      if (findTemplateError) throw findTemplateError;

      const templateValues = {
        slug: FOTOS_AJINOMOTO_SLUG,
        name: "Fotos Ajinomoto",
        description: "Registro de materiais de campanha e foto do espaço no cliente.",
        icon: "Camera",
        color: "primary",
        is_active: true,
        is_system: false,
        requires_geolocation: false,
        generates_pdf: false,
        dashboard_config: { show_kpis: true, show_charts: false, show_map: false },
      };

      if (template) {
        const { error } = await templates.update(templateValues).eq("id", template.id);
        if (error) throw error;
      } else {
        // O Lovable Cloud atual não expõe display_order em form_templates.
        // A posição na interface é definida pelo nome; não dependemos dessa
        // coluna opcional para criar o formulário.
        const { data, error } = await templates
          .insert(templateValues)
          .select("id")
          .single();
        if (error) throw error;
        template = data;
      }

      const sections: any = supabase.from("form_sections");
      let { data: section, error: findSectionError } = await sections
        .select("id")
        .eq("template_id", template.id)
        .eq("title", "Registro da campanha")
        .maybeSingle();
      if (findSectionError) throw findSectionError;

      if (!section) {
        const { data, error } = await sections.insert({
          template_id: template.id,
          title: "Registro da campanha",
          description: "Informe o RCA, o cliente, os materiais instalados e envie uma foto.",
          display_order: 1,
          is_active: true,
        }).select("id").single();
        if (error) throw error;
        section = data;
      } else {
        const { error } = await sections.update({
          description: "Informe o RCA, o cliente, os materiais instalados e envie uma foto.",
          display_order: 1,
          is_active: true,
        }).eq("id", section.id);
        if (error) throw error;
      }

      const questions: any = supabase.from("form_questions");
      const { data: existingQuestions, error: existingError } = await questions
        .select("id, label")
        .eq("section_id", section.id);
      if (existingError) throw existingError;

      const saveQuestion = async (definition: QuestionDefinition) => {
        const existing = (existingQuestions || []).find((question: any) => question.label === definition.label);
        const values = { section_id: section.id, is_active: true, is_chart_metric: false, ...definition };
        if (existing) {
          const { error } = await questions.update(values).eq("id", existing.id);
          if (error) throw error;
          return existing.id as string;
        }
        const { data, error } = await questions.insert(values).select("id").single();
        if (error) throw error;
        return data.id as string;
      };

      const vendorQuestionId = await saveQuestion({
        label: "Código do RCA",
        question_type: "vendor_select",
        description: "Selecione a rota do RCA que está realizando a ação.",
        placeholder: "Buscar RCA...",
        is_required: true,
        options: null,
        slider_config: null,
        conditional_logic: { standalone: true },
        display_order: 1,
        identification_role: "vendor",
      });

      await saveQuestion({
        label: "Código do Cliente",
        question_type: "client_select",
        description: "Pesquise o cliente ativo por código, razão social ou CNPJ.",
        placeholder: "Buscar cliente por código, razão social ou CNPJ...",
        is_required: true,
        options: null,
        slider_config: null,
        conditional_logic: { vendor_question_id: vendorQuestionId, show_client_details: true },
        display_order: 2,
        identification_role: "client_code",
      });

      await saveQuestion({
        label: "Material da campanha",
        question_type: "multi_select",
        description: "Marque Wobbler, Take One, Selo ou qualquer combinação dos materiais.",
        placeholder: null,
        is_required: true,
        options: [
          { value: "wobbler", label: "Wobbler" },
          { value: "take_one", label: "Take One" },
          { value: "selo", label: "Selo" },
        ],
        slider_config: null,
        conditional_logic: null,
        display_order: 3,
        identification_role: null,
      });

      await saveQuestion({
        label: "Foto do espaço",
        question_type: "image_upload",
        description: "Envie uma única foto mostrando o espaço e o material instalado.",
        placeholder: null,
        is_required: true,
        options: null,
        slider_config: { maxImages: 1 },
        conditional_logic: null,
        display_order: 4,
        identification_role: null,
      });

      setReady(true);
      toast.success("Formulário Fotos Ajinomoto configurado com sucesso.");
    } catch (caught: any) {
      toast.error("Não foi possível configurar o formulário", { description: caught?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center bg-mesh px-4 py-10">
        <Card className="w-full max-w-2xl glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />Configurar Fotos Ajinomoto</CardTitle>
            <CardDescription>
              Esta ação é segura e repetível: cria o formulário se ele não existir e atualiza apenas os quatro campos próprios dele.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>RCA independente, sem exigir gestor.</li>
              <li>Busca segura na base ativa, com código, CNPJ e razão social.</li>
              <li>Wobbler, Take One e Selo: uma ou mais opções.</li>
              <li>Uma foto obrigatória e preservada no armazenamento privado.</li>
            </ul>
            {ready ? (
              <div className="space-y-3 rounded-lg bg-success/10 p-4">
                <p className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-5 w-5" />Configuração concluída.</p>
                <Button asChild className="w-full"><Link to={`/form/${FOTOS_AJINOMOTO_SLUG}`}>Abrir formulário</Link></Button>
              </div>
            ) : (
              <Button className="w-full min-h-11" onClick={() => void configure()} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar ou atualizar formulário
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
