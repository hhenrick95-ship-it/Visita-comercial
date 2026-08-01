import { Layout } from "@/components/Layout";
import { VisitForm } from "@/components/VisitForm";

/**
 * Página dedicada do formulário padrão "Visita Comercial".
 *
 * Esta rota é separada do fluxo dinâmico (/form/:slug) para garantir
 * que o template padrão NUNCA carregue seções/perguntas de outros
 * templates (PEX, JBP). É o único caminho oficial para o formulário
 * legado de visita comercial.
 */
export default function VisitaComercial() {
  return (
    <Layout>
      <VisitForm />
    </Layout>
  );
}