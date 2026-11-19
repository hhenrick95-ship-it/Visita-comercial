import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FOTOS_AJINOMOTO_SLUG } from "@/lib/restrictedFormAccess";

const imagePath = (value: unknown): string | null => {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string" || !first.trim()) return null;
  try {
    const url = new URL(first);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/form-images\/(.+)/);
    return match ? decodeURIComponent(match[1]) : first;
  } catch {
    return first;
  }
};

export default function FotosAjinomotoPhoto() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const autoStarted = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!submissionId) return;
      try {
        const { data: template, error: templateError } = await supabase
          .from("form_templates" as any)
          .select("id")
          .eq("slug", FOTOS_AJINOMOTO_SLUG)
          .single();
        if (templateError) throw templateError;

        const { data: submission, error: submissionError } = await supabase
          .from("form_submissions")
          .select("id, template_id")
          .eq("id", submissionId)
          .eq("template_id", (template as any).id)
          .single();
        if (submissionError || !submission) throw new Error("Registro não encontrado ou sem permissão de acesso.");

        const { data: sections, error: sectionsError } = await supabase
          .from("form_sections")
          .select("id")
          .eq("template_id", (template as any).id);
        if (sectionsError) throw sectionsError;
        const sectionIds = (sections || []).map((section) => section.id);

        const { data: questions, error: questionsError } = await supabase
          .from("form_questions")
          .select("id")
          .in("section_id", sectionIds)
          .eq("question_type", "image_upload");
        if (questionsError) throw questionsError;
        const questionIds = (questions || []).map((question) => question.id);
        if (!questionIds.length) throw new Error("Campo de foto não encontrado.");

        const { data: response, error: responseError } = await supabase
          .from("form_responses")
          .select("response_value")
          .eq("submission_id", submissionId)
          .in("question_id", questionIds)
          .limit(1)
          .maybeSingle();
        if (responseError) throw responseError;
        const resolvedPath = imagePath(response?.response_value);
        if (!resolvedPath) throw new Error("Este registro não possui foto.");
        if (active) setPath(resolvedPath);
      } catch (caught: any) {
        if (active) setError(caught?.message || "Não foi possível localizar a foto.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [submissionId]);

  const download = useCallback(async () => {
    if (!path || !submissionId) return;
    setDownloading(true);
    setError("");
    try {
      const { data, error: downloadError } = await supabase.storage.from("form-images").download(path);
      if (downloadError) throw downloadError;
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      const extension = path.match(/\.([a-z0-9]+)$/i)?.[1] || "jpg";
      anchor.href = objectUrl;
      anchor.download = `foto-ajinomoto-${submissionId}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (caught: any) {
      setError(caught?.message || "Não foi possível baixar a foto.");
    } finally {
      setDownloading(false);
    }
  }, [path, submissionId]);

  useEffect(() => {
    if (path && !autoStarted.current) {
      autoStarted.current = true;
      void download();
    }
  }, [path, download]);

  if (!submissionId) return <Navigate to={`/form/${FOTOS_AJINOMOTO_SLUG}/resultados`} replace />;

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center bg-mesh px-4">
        <Card className="w-full max-w-md glass-card border-0">
          <CardHeader>
            <CardTitle>Foto do espaço</CardTitle>
            <CardDescription>A foto é privada. É necessário estar conectado para baixá-la.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparando download...</div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Se o download não iniciou automaticamente, use o botão abaixo.</p>
            )}
            <Button className="w-full" onClick={() => void download()} disabled={!path || downloading}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Baixar foto
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={`/form/${FOTOS_AJINOMOTO_SLUG}/resultados`}>Voltar aos resultados</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
