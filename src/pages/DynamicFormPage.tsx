import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { VisitForm } from "@/components/VisitForm";
import { DynamicForm } from "@/components/DynamicForm";
import { useFormTemplate } from "@/hooks/useFormTemplates";
import { Loader2 } from "lucide-react";

export default function DynamicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Blindagem: o formulário padrão "Visita Comercial" tem rota dedicada
  // (/visitas/nova/visita-comercial). Se algum link antigo cair em
  // /form/visita, redireciona para a rota correta antes de qualquer
  // tentativa de carregar a estrutura genérica.
  if (slug === "visita") {
    return <Navigate to="/visitas/nova/visita-comercial" replace />;
  }

  // O antigo template "Atualização do Ramo de Atividade" foi substituído
  // pelo módulo dedicado de Atualização Cadastral de Clientes.
  if (slug === "atualizacao-do-ramo-de-atividade") {
    return <Navigate to="/clientes/atualizacao-cadastral" replace />;
  }

  const { template, loading } = useFormTemplate(slug);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!template) {
    return <Navigate to="/" replace />;
  }

  // Salvaguarda extra: jamais renderizar o formulário dinâmico para o
  // template padrão (visita). Sempre redirecionar.
  if (template.slug === "visita") {
    return <Navigate to="/visitas/nova/visita-comercial" replace />;
  }

  return (
    <Layout>
      <DynamicForm template={template} onCancel={() => navigate("/")} />
    </Layout>
  );
}
