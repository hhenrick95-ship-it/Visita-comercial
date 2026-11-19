import { Navigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Camera } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { SubmissionsList } from "@/components/SubmissionsList";
import { useFormTemplate } from "@/hooks/useFormTemplates";
import { FOTOS_AJINOMOTO_SLUG } from "@/lib/restrictedFormAccess";

export default function FotosAjinomotoResults() {
  const { template, loading } = useFormTemplate(FOTOS_AJINOMOTO_SLUG);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!template) return <Navigate to="/" replace />;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-mesh">
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                <Camera className="h-7 w-7 text-primary" />
                Resultados — Fotos Ajinomoto
              </h1>
              <p className="text-muted-foreground">Consulte os registros e use Excel para exportar uma linha por envio.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Início</Link>
              </Button>
              <Button asChild>
                <Link to={`/form/${FOTOS_AJINOMOTO_SLUG}`}>Novo registro</Link>
              </Button>
            </div>
          </div>
          <SubmissionsList template={template} />
        </div>
      </div>
    </Layout>
  );
}
