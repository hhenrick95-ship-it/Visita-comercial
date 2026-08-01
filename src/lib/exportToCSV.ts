// Helper function to escape CSV values
import { formatDateOnlyPtBR } from "@/lib/utils";

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to format date for filename
function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface VisitForExport {
  id: string;
  visit_date: string;
  client_code: string;
  manager: string;
  rca_accompanied: string;
  address?: string | null;
  relationship_level?: number | null;
  execution_level?: number | null;
  delivery_level?: number | null;
  prices_visible_correct?: boolean;
  adequate_assortment_available?: boolean;
  has_merchandising_material?: boolean;
  vendor_applied_positivation?: boolean;
  has_mix_expansion_opportunities?: boolean;
  has_visibility_improvement_opportunities?: boolean;
  created_at?: string;
}

interface FeedbackForExport {
  id: string;
  created_at: string;
  vendor_code: string;
  supervisor: string;
  constructive_criticism: string;
  action_plan: string;
}

export function exportVisitsToCSV(visits: VisitForExport[], startDate?: string, endDate?: string): void {
  const headers = [
    "ID",
    "Data da Visita",
    "Código Cliente",
    "Gestor",
    "Vendedor Acompanhado",
    "Endereço",
    "Nível Relacionamento",
    "Nível Execução",
    "Nível Entrega",
    "Score Médio",
    "Preços Visíveis",
    "Sortimento Adequado",
    "Material Merchandising",
    "Positivação Aplicada",
    "Oportunidade Mix",
    "Oportunidade Visibilidade",
    "Data Criação"
  ];

  const rows = visits.map((visit) => {
    const relationshipLevel = visit.relationship_level || 0;
    const executionLevel = visit.execution_level || 0;
    const deliveryLevel = visit.delivery_level || 0;
    const avgScore = ((relationshipLevel + executionLevel + deliveryLevel) / 3).toFixed(2);

    return [
      visit.id,
      formatDateOnlyPtBR(visit.visit_date),
      visit.client_code,
      visit.manager,
      visit.rca_accompanied,
      visit.address || "",
      relationshipLevel,
      executionLevel,
      deliveryLevel,
      avgScore,
      visit.prices_visible_correct ? "Sim" : "Não",
      visit.adequate_assortment_available ? "Sim" : "Não",
      visit.has_merchandising_material ? "Sim" : "Não",
      visit.vendor_applied_positivation ? "Sim" : "Não",
      visit.has_mix_expansion_opportunities ? "Sim" : "Não",
      visit.has_visibility_improvement_opportunities ? "Sim" : "Não",
      visit.created_at ? new Date(visit.created_at).toLocaleDateString("pt-BR") : ""
    ].map(escapeCSV);
  });

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

  // Generate filename with date range
  let filename = "visitas";
  if (startDate && endDate) {
    filename += `_${startDate}_a_${endDate}`;
  } else if (startDate) {
    filename += `_desde_${startDate}`;
  } else if (endDate) {
    filename += `_ate_${endDate}`;
  } else {
    filename += `_${formatDateForFilename(new Date())}`;
  }
  filename += ".csv";

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFeedbacksToCSV(feedbacks: FeedbackForExport[], startDate?: string, endDate?: string): void {
  const headers = [
    "ID",
    "Data Criação",
    "Código Vendedor",
    "Supervisor",
    "Crítica Construtiva",
    "Plano de Ação"
  ];

  const rows = feedbacks.map((feedback) => [
    feedback.id,
    new Date(feedback.created_at).toLocaleDateString("pt-BR"),
    feedback.vendor_code,
    feedback.supervisor,
    feedback.constructive_criticism,
    feedback.action_plan
  ].map(escapeCSV));

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

  // Generate filename with date range
  let filename = "feedbacks";
  if (startDate && endDate) {
    filename += `_${startDate}_a_${endDate}`;
  } else if (startDate) {
    filename += `_desde_${startDate}`;
  } else if (endDate) {
    filename += `_ate_${endDate}`;
  } else {
    filename += `_${formatDateForFilename(new Date())}`;
  }
  filename += ".csv";

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
