import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import logoLopes from "@/assets/logo-lopes.png";

interface FeedbackData {
  id: string;
  supervisor: string;
  constructive_criticism: string;
  action_plan: string;
  vendor_code: string;
}

interface VisitData {
  visit_date: string;
  manager: string;
  rca_accompanied: string;
  client_code: string;
  address?: string;
}

// ==================== CONSTANTES DE LAYOUT ====================
const PAGE_TOP = 20;
const FOOTER_HEIGHT = 25;
const FONT_SIZE_LABEL = 9;
const FONT_SIZE_VALUE = 8;
const LINE_HEIGHT = 5;
const BLOCK_GAP = 4;
const SECTION_GAP = 8;

export async function generateFeedbackPDF(
  feedbackData: FeedbackData,
  visitData: VisitData
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const PAGE_BOTTOM = pageHeight - FOOTER_HEIGHT;

  let yPosition = PAGE_TOP;

  const newPage = (): void => {
    doc.addPage();
    yPosition = PAGE_TOP;
  };

  const ensureSpace = (neededHeight: number): void => {
    if (yPosition + neededHeight > PAGE_BOTTOM) {
      newPage();
    }
  };

  // ==================== CAPA ====================
  // Fundo azul claro
  doc.setFillColor(220, 235, 250);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Elementos decorativos
  doc.setFillColor(155, 35, 53);
  doc.rect(0, 0, pageWidth, 8, "F");
  
  doc.setFillColor(27, 79, 124);
  doc.rect(0, 8, pageWidth, 4, "F");

  // Logo centralizada
  const logoWidth = 60;
  const logoHeight = 60;
  doc.addImage(logoLopes, "PNG", (pageWidth - logoWidth) / 2, 50, logoWidth, logoHeight);

  // Titulo principal
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("FEEDBACK DO GESTOR", pageWidth / 2, 135, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text("Acompanhamento de Rota", pageWidth / 2, 148, { align: "center" });

  // Linha decorativa
  doc.setDrawColor(27, 79, 124);
  doc.setLineWidth(1);
  doc.line(marginLeft + 30, 158, pageWidth - marginLeft - 30, 158);

  // Data da visita
  const [fy, fm, fd] = (visitData.visit_date || "").split("-").map(Number);
  const visitDateFormatted = fy && fm && fd
    ? new Date(fy, fm - 1, fd).toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : visitData.visit_date || "";
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.text(visitDateFormatted, pageWidth / 2, 172, { align: "center" });

  // Box de informacoes
  const infoBoxY = 190;
  const infoBoxHeight = 85;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginLeft + 20, infoBoxY, contentWidth - 40, infoBoxHeight, 5, 5, "F");

  const infoItems = [
    { label: "Supervisor", value: feedbackData.supervisor || "-" },
    { label: "Gestor/Equipe", value: visitData.manager || "-" },
    { label: "Vendedor Acompanhado", value: visitData.rca_accompanied || "-" },
    { label: "Codigo do Cliente", value: visitData.client_code || "-" },
  ];

  doc.setFontSize(11);
  let infoY = infoBoxY + 18;
  infoItems.forEach((item) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(item.label + ":", marginLeft + 30, infoY);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 79, 124);
    doc.text(item.value, marginLeft + 95, infoY);
    infoY += 16;
  });

  // Rodape da capa
  doc.setFillColor(27, 79, 124);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("Distribuidora Lopes", pageWidth / 2, pageHeight - 10, { align: "center" });

  // ==================== PAGINA DE CONTEUDO ====================
  newPage();

  // Header
  doc.setFillColor(220, 235, 250);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setFillColor(155, 35, 53);
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFillColor(27, 79, 124);
  doc.rect(0, 4, pageWidth, 2, "F");

  doc.addImage(logoLopes, "PNG", marginLeft, 12, 30, 30);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("Feedback do Gestor", pageWidth - marginRight, 22, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(visitDateFormatted, pageWidth - marginRight, 30, { align: "right" });

  // ==================== INFO BOX ====================
  yPosition = 55;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginLeft, yPosition, contentWidth, 28, 3, 3, "F");

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const col1X = marginLeft + 8;
  const col2X = pageWidth / 2 + 5;

  doc.setFont("helvetica", "normal");
  doc.text("Supervisor:", col1X, yPosition + 8);
  doc.text("Gestor/Equipe:", col1X, yPosition + 16);
  doc.text("Vendedor:", col2X, yPosition + 8);
  doc.text("Cliente:", col2X, yPosition + 16);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(feedbackData.supervisor || "-", col1X + 28, yPosition + 8);
  doc.text(visitData.manager || "-", col1X + 35, yPosition + 16);
  doc.text(visitData.rca_accompanied || "-", col2X + 25, yPosition + 8);
  doc.text(visitData.client_code || "-", col2X + 20, yPosition + 16);

  yPosition = 55 + 28 + 15;

  // ==================== CRITICA CONSTRUTIVA ====================
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("CRITICA CONSTRUTIVA", marginLeft, yPosition);
  yPosition += 8;

  doc.setFontSize(FONT_SIZE_VALUE);
  const criticismLines = doc.splitTextToSize(feedbackData.constructive_criticism || "-", contentWidth - 16);
  const criticismHeight = Math.max(20, criticismLines.length * LINE_HEIGHT + 12);

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(marginLeft, yPosition, contentWidth, criticismHeight, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  let textY = yPosition + 8;
  criticismLines.forEach((line: string) => {
    if (textY + LINE_HEIGHT > PAGE_BOTTOM) {
      newPage();
      textY = PAGE_TOP;
    }
    doc.text(line, marginLeft + 8, textY);
    textY += LINE_HEIGHT;
  });

  yPosition += criticismHeight + 15;

  // ==================== PLANO DE ACAO ====================
  ensureSpace(50);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("PLANO DE ACAO", marginLeft, yPosition);
  yPosition += 8;

  doc.setFontSize(FONT_SIZE_VALUE);
  const actionLines = doc.splitTextToSize(feedbackData.action_plan || "-", contentWidth - 16);
  const actionHeight = Math.max(20, actionLines.length * LINE_HEIGHT + 12);

  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(marginLeft, yPosition, contentWidth, actionHeight, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  textY = yPosition + 8;
  actionLines.forEach((line: string) => {
    if (textY + LINE_HEIGHT > PAGE_BOTTOM) {
      newPage();
      textY = PAGE_TOP;
    }
    doc.text(line, marginLeft + 8, textY);
    textY += LINE_HEIGHT;
  });

  yPosition += actionHeight + 15;

  // ==================== INFORMACOES DA VISITA ====================
  ensureSpace(60);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("INFORMACOES DA VISITA", marginLeft, yPosition);
  yPosition += 8;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginLeft, yPosition, contentWidth, 45, 3, 3, "F");

  const visitInfoItems = [
    { label: "Data da Visita", value: visitDateFormatted },
    { label: "Codigo do Vendedor", value: visitData.rca_accompanied || "-" },
    { label: "Codigo do Cliente", value: visitData.client_code || "-" },
  ];

  doc.setFontSize(FONT_SIZE_LABEL);
  let visitInfoY = yPosition + 10;
  visitInfoItems.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text(item.label + ":", marginLeft + 8, visitInfoY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(item.value, marginLeft + 55, visitInfoY);
    visitInfoY += 12;
  });

  // ==================== RODAPE DECORATIVO ====================
  const totalPages = doc.internal.pages.length - 1;
  
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFillColor(27, 79, 124);
    doc.rect(0, pageHeight - 18, pageWidth, 3, "F");

    doc.setFillColor(155, 35, 53);
    doc.rect(0, pageHeight - 15, pageWidth, 1.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(27, 79, 124);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginLeft, pageHeight - 8);
    doc.text(`Pagina ${i - 1} de ${totalPages - 1}`, pageWidth - marginRight, pageHeight - 8, { align: "right" });

    doc.setFillColor(27, 79, 124);
    doc.rect(0, pageHeight - 3, pageWidth, 1, "F");
  }

  // ==================== UPLOAD E SALVAR ====================
  const fileName = `feedback-${visitData.rca_accompanied}-${visitData.visit_date}.pdf`;
  const filePath = `${feedbackData.id}/${fileName}`;
  const pdfBlob = doc.output("blob");

  try {
    const { error: uploadError } = await supabase.storage
      .from("visit-pdfs")
      .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    await supabase
      .from("feedbacks")
      .update({ pdf_path: filePath })
      .eq("id", feedbackData.id);

    doc.save(fileName);
  } catch (error) {
    console.error("Erro ao salvar PDF:", error);
    throw error;
  }

  return doc;
}
