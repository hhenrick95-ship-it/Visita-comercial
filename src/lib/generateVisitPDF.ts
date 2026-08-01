import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import logoLopes from "@/assets/logo-lopes.png";

interface FormSection {
  id: string;
  title: string;
  display_order: number;
}

interface FormQuestion {
  id: string;
  section_id: string;
  label: string;
  question_type: string;
  options?: { label: string; value: string }[];
}

interface FormResponse {
  question_id: string;
  response_value: any;
}

interface TOCItem {
  title: string;
  page: number;
}

// ==================== CONSTANTES DE LAYOUT ====================
const PAGE_TOP = 20;
const FOOTER_HEIGHT = 25;
const FONT_SIZE_TITLE = 12;
const FONT_SIZE_LABEL = 9;
const FONT_SIZE_VALUE = 8;
const LINE_HEIGHT = 5;
const BLOCK_GAP = 4;
const SECTION_GAP = 8;

// Helper para extrair o path do arquivo de imagem
function extractFormImagePath(input: string): string {
  if (!input) return "";
  
  if (!input.includes("/")) {
    return input;
  }
  
  try {
    const url = new URL(input, "http://dummy");
    const pathname = url.pathname;
    
    const publicMatch = pathname.match(/\/object\/(?:public|sign)\/form-images\/(.+)/);
    if (publicMatch) {
      return publicMatch[1].split("?")[0];
    }
    
    const storageMatch = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/form-images\/(.+)/);
    if (storageMatch) {
      return storageMatch[1].split("?")[0];
    }
  } catch {
    // Nao e uma URL valida
  }
  
  return input;
}

// Helper para carregar imagem como base64
async function loadImageAsBase64(imageInput: string): Promise<string | null> {
  try {
    const filePath = extractFormImagePath(imageInput);
    if (!filePath) return null;

    const { data, error } = await supabase.storage.from("form-images").download(filePath);

    if (error || !data) {
      console.error("Error downloading image:", error);
      return null;
    }

    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(data);
    });

    if (!dataUrl) return null;

    if (dataUrl.startsWith("data:image/png") || dataUrl.startsWith("data:image/jpeg")) {
      return dataUrl;
    }

    const converted = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        try {
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });

    return converted;
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
}

// Helper para desenhar barra de progresso
function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,
  maxValue: number,
  label: string
) {
  const percentage = value / maxValue;
  const filledWidth = width * percentage;

  doc.setFillColor(229, 231, 235);
  doc.roundedRect(x, y, width, height, 2, 2, "F");

  let fillColor: [number, number, number];
  if (percentage >= 0.8) {
    fillColor = [34, 197, 94];
  } else if (percentage >= 0.6) {
    fillColor = [234, 179, 8];
  } else if (percentage >= 0.4) {
    fillColor = [249, 115, 22];
  } else {
    fillColor = [239, 68, 68];
  }
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, filledWidth, height, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(55, 65, 81);
  doc.text(label, x, y - 2);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`${value}/${maxValue}`, x + width + 5, y + height - 1);
}

// Helper para desenhar badge de status
function drawStatusBadge(
  doc: jsPDF,
  x: number,
  y: number,
  text: string,
  isPositive: boolean
) {
  const badgeWidth = doc.getTextWidth(text) + 10;
  const badgeHeight = 6;

  if (isPositive) {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(153, 27, 27);
  }

  doc.roundedRect(x, y - 4, badgeWidth, badgeHeight, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(text, x + 5, y);
}

// Calcular classificacao do score
function getScoreClassification(score: number): { label: string; color: [number, number, number] } {
  if (score >= 4.5) return { label: "EXCELENTE", color: [22, 101, 52] };
  if (score >= 3.5) return { label: "BOM", color: [34, 197, 94] };
  if (score >= 2.5) return { label: "REGULAR", color: [234, 179, 8] };
  if (score >= 1.5) return { label: "PRECISA MELHORAR", color: [249, 115, 22] };
  return { label: "CRITICO", color: [239, 68, 68] };
}

export async function generateVisitPDF(visitFormId: string, fileName?: string) {
  // Fetch visit form data
  const { data: visitData, error: visitError } = await supabase
    .from("visit_forms")
    .select("*")
    .eq("id", visitFormId)
    .single();

  if (visitError) throw new Error("Erro ao carregar dados da visita");

  // Buscar o template "Visita Comercial" para isolar suas seções/perguntas
  const templatesClient: any = supabase.from("form_templates");
  const { data: templateData } = await templatesClient
    .select("id")
    .eq("slug", "visita")
    .maybeSingle();
  const visitaTemplateId = (templateData as any)?.id as string | undefined;

  // Fetch sections
  const { data: sections, error: sectionsError } = await supabase
    .from("form_sections")
    .select("*")
    .eq("template_id", visitaTemplateId ?? "00000000-0000-0000-0000-000000000000")
    .order("display_order");

  if (sectionsError) throw new Error("Erro ao carregar secoes");

  const sectionIdList = (sections || []).map((s: any) => s.id);
  // Fetch questions
  const { data: questions, error: questionsError } = await supabase
    .from("form_questions")
    .select("*")
    .in("section_id", sectionIdList.length ? sectionIdList : ["00000000-0000-0000-0000-000000000000"])
    .order("display_order");

  if (questionsError) throw new Error("Erro ao carregar perguntas");

  // Fetch responses
  const { data: responses, error: responsesError } = await supabase
    .from("form_responses")
    .select("question_id, response_value")
    .eq("visit_form_id", visitFormId);

  if (responsesError) throw new Error("Erro ao carregar respostas");

  // Create response map
  const responseMap: Record<string, any> = {};
  responses?.forEach((r) => {
    responseMap[r.question_id] = r.response_value;
  });

  // Group questions by section
  const questionsBySection: Record<string, any[]> = {};
  questions?.forEach((q) => {
    if (q.section_id) {
      if (!questionsBySection[q.section_id]) {
        questionsBySection[q.section_id] = [];
      }
      questionsBySection[q.section_id].push(q);
    }
  });

  // Collect all images to be added at the end
  const allImages: { url: string; label: string }[] = [];

  // Table of contents items
  const tocItems: TOCItem[] = [];

  // Generate PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const PAGE_BOTTOM = pageHeight - FOOTER_HEIGHT;

  // ==================== HELPERS DE PAGINACAO ====================
  let yPosition = PAGE_TOP;

  const getCurrentPage = (): number => {
    return doc.internal.pages.length - 1;
  };

  const newPage = (): void => {
    doc.addPage();
    yPosition = PAGE_TOP;
  };

  const ensureSpace = (neededHeight: number): void => {
    if (yPosition + neededHeight > PAGE_BOTTOM) {
      newPage();
    }
  };

  const addTOCItem = (title: string): void => {
    tocItems.push({ title, page: getCurrentPage() });
  };

  // ==================== CAPA ====================
  // Fundo azul claro igual aos cabeçalhos
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
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("RELATORIO DE VISITA", pageWidth / 2, 140, { align: "center" });

  // Linha decorativa
  doc.setDrawColor(27, 79, 124);
  doc.setLineWidth(1);
  doc.line(marginLeft + 30, 150, pageWidth - marginLeft - 30, 150);

  // Data da visita
  const [vy, vm, vd] = (visitData.visit_date || "").split("-").map(Number);
  const visitDateFormatted = vy && vm && vd
    ? new Date(vy, vm - 1, vd).toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : visitData.visit_date || "";
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(visitDateFormatted, pageWidth / 2, 165, { align: "center" });

  // Box de informacoes
  const infoBoxY = 190;
  const infoBoxHeight = 70;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginLeft + 20, infoBoxY, contentWidth - 40, infoBoxHeight, 5, 5, "F");

  // Informacoes da visita
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  
  const infoItems = [
    { label: "Gestor", value: visitData.manager || "-" },
    { label: "Vendedor Acompanhado", value: visitData.rca_accompanied || "-" },
    { label: "Codigo do Cliente", value: visitData.client_code || "-" },
  ];

  let infoY = infoBoxY + 18;
  infoItems.forEach((item) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(item.label + ":", marginLeft + 30, infoY);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 79, 124);
    doc.text(item.value, marginLeft + 85, infoY);
    infoY += 16;
  });

  // Rodape da capa
  doc.setFillColor(27, 79, 124);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("Distribuidora Lopes", pageWidth / 2, pageHeight - 10, { align: "center" });

  // ==================== PAGINA DO INDICE ====================
  newPage();
  const tocPageNumber = getCurrentPage();

  // Header do indice
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFillColor(27, 79, 124);
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("INDICE", pageWidth / 2, 28, { align: "center" });

  yPosition = 55;

  // Placeholder para os itens do indice (sera preenchido depois)
  const tocStartY = yPosition;
  
  // Reservar espaco para o indice (sera preenchido no final)
  yPosition = 55;

  // ==================== PAGINA DE CONTEUDO ====================
  newPage();

  // ==================== HEADER ====================
  doc.setFillColor(220, 235, 250);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setFillColor(155, 35, 53);
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFillColor(27, 79, 124);
  doc.rect(0, 4, pageWidth, 2, "F");

  doc.addImage(logoLopes, "PNG", marginLeft, 12, 30, 30);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("Relatorio de Visita", pageWidth - marginRight, 22, { align: "right" });

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
  doc.text("Gestor:", col1X, yPosition + 8);
  doc.text("Vendedor:", col1X, yPosition + 16);
  doc.text("Cliente:", col2X, yPosition + 8);
  doc.text("Endereco:", col2X, yPosition + 16);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(visitData.manager || "-", col1X + 25, yPosition + 8);
  doc.text(visitData.rca_accompanied || "-", col1X + 25, yPosition + 16);
  doc.text(visitData.client_code || "-", col2X + 25, yPosition + 8);

  const addressText = visitData.address || "-";
  const truncatedAddress = addressText.length > 35 ? addressText.substring(0, 35) + "..." : addressText;
  doc.text(truncatedAddress, col2X + 25, yPosition + 16);

  yPosition = 55 + 28 + 10;

  // ==================== INDICADORES DE PERFORMANCE ====================
  addTOCItem("Indicadores de Performance");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("INDICADORES DE PERFORMANCE", marginLeft, yPosition);
  yPosition += 10;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(marginLeft, yPosition, contentWidth, 55, 3, 3, "F");

  const indicatorStartY = yPosition + 15;
  const barWidth = 60;
  const barHeight = 6;

  const relationshipLevel = visitData.relationship_level || 0;
  drawProgressBar(doc, marginLeft + 8, indicatorStartY, barWidth, barHeight, relationshipLevel, 5, "Relacionamento");

  const executionLevel = visitData.execution_level || 0;
  drawProgressBar(doc, marginLeft + 8, indicatorStartY + 15, barWidth, barHeight, executionLevel, 5, "Execucao");

  const deliveryLevel = visitData.delivery_level || 0;
  drawProgressBar(doc, marginLeft + 8, indicatorStartY + 30, barWidth, barHeight, deliveryLevel, 5, "Entrega");

  const avgScore = (relationshipLevel + executionLevel + deliveryLevel) / 3;
  const classification = getScoreClassification(avgScore);

  // Posicionar Score Geral na metade direita da caixa
  const scoreX = marginLeft + contentWidth / 2 + 20;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(55, 65, 81);
  doc.text("Score Geral", scoreX, indicatorStartY + 5);

  doc.setFontSize(24);
  doc.setTextColor(...classification.color);
  doc.text(avgScore.toFixed(1), scoreX, indicatorStartY + 18);

  doc.setFontSize(8);
  doc.text(classification.label, scoreX, indicatorStartY + 26);

  const percentage = Math.round((avgScore / 5) * 100);
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`${percentage}%`, scoreX + 25, indicatorStartY + 18);

  yPosition += 65;

  // ==================== STATUS RESUMO ====================
  addTOCItem("Resumo de Conformidade");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("RESUMO DE CONFORMIDADE", marginLeft, yPosition);
  yPosition += 8;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(marginLeft, yPosition, contentWidth, 22, 3, 3, "F");

  const statusY = yPosition + 8;
  const statusGap = 42;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  const statusItems = [
    { label: "Precos Visiveis", value: visitData.prices_visible_correct },
    { label: "Sortimento", value: visitData.adequate_assortment_available },
    { label: "Merchandising", value: visitData.has_merchandising_material },
    { label: "Positivacao", value: visitData.vendor_applied_positivation }
  ];

  statusItems.forEach((item, index) => {
    const x = marginLeft + 8 + (index * statusGap);
    drawStatusBadge(doc, x, statusY, item.value ? "SIM" : "NAO", item.value);
    doc.setTextColor(107, 114, 128);
    doc.text(item.label, x, statusY + 8);
  });

  yPosition += 30;

  // ==================== OPORTUNIDADES ====================
  addTOCItem("Oportunidades Identificadas");
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text("OPORTUNIDADES IDENTIFICADAS", marginLeft, yPosition);
  yPosition += 8;

  const opportunities = [
    {
      label: "Expansao de Mix",
      has: visitData.has_mix_expansion_opportunities,
      details: visitData.mix_expansion_details
    },
    {
      label: "Melhoria de Visibilidade",
      has: visitData.has_visibility_improvement_opportunities,
      details: visitData.visibility_improvement_details
    }
  ];

  const hasAnyOpportunity = opportunities.some((opp) => opp.has);

  if (hasAnyOpportunity) {
    opportunities.forEach((opp) => {
      if (opp.has) {
        doc.setFontSize(FONT_SIZE_VALUE);
        const detailLines = opp.details ? doc.splitTextToSize(opp.details, contentWidth - 20) : [];
        const boxHeight = 10 + (detailLines.length > 0 ? detailLines.length * LINE_HEIGHT + 2 : 0);
        
        ensureSpace(boxHeight + 3);
        
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(marginLeft, yPosition, contentWidth, boxHeight, 2, 2, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 101, 52);
        doc.text(opp.label, marginLeft + 5, yPosition + 7);

        if (detailLines.length > 0) {
          doc.setFontSize(FONT_SIZE_VALUE);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          let detailY = yPosition + 12;
          detailLines.forEach((line: string) => {
            doc.text(line, marginLeft + 10, detailY);
            detailY += LINE_HEIGHT;
          });
        }

        yPosition += boxHeight + 3;
      }
    });
  } else {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 12, 2, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(107, 114, 128);
    doc.text("OPORTUNIDADE NAO ENCONTRADA PELO AVALIADOR", marginLeft + 5, yPosition + 8);

    yPosition += 15;
  }

  yPosition += 5;

  // ==================== OBSERVACOES DO GESTOR ====================
  const hasObservations = visitData.vendor_observations || visitData.additional_comments || visitData.ruptures_description;
  
  if (hasObservations) {
    addTOCItem("Observacoes do Gestor");
    
    const obsItems: { label: string; value: string }[] = [];
    
    if (visitData.vendor_observations) {
      obsItems.push({ label: "Observacoes sobre o Vendedor", value: visitData.vendor_observations });
    }
    if (visitData.ruptures_description) {
      obsItems.push({ label: "Descricao de Rupturas", value: visitData.ruptures_description });
    }
    if (visitData.additional_comments) {
      obsItems.push({ label: "Comentarios Adicionais", value: visitData.additional_comments });
    }

    doc.setFontSize(FONT_SIZE_VALUE);
    let observationsHeight = 8;
    obsItems.forEach((item) => {
      const textLines = doc.splitTextToSize(item.value, contentWidth - 20);
      observationsHeight += LINE_HEIGHT + 2 + (textLines.length * LINE_HEIGHT) + 3;
    });

    ensureSpace(observationsHeight + 18);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 79, 124);
    doc.text("OBSERVACOES DO GESTOR", marginLeft, yPosition);
    yPosition += 8;

    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(marginLeft, yPosition, contentWidth, observationsHeight, 3, 3, "FD");

    let obsY = yPosition + 6;
    obsItems.forEach((item) => {
      doc.setFontSize(FONT_SIZE_VALUE);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(146, 64, 14);
      doc.text(item.label + ":", marginLeft + 5, obsY);
      obsY += LINE_HEIGHT + 1;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const textLines = doc.splitTextToSize(item.value, contentWidth - 20);
      textLines.forEach((line: string) => {
        doc.text(line, marginLeft + 8, obsY);
        obsY += LINE_HEIGHT;
      });
      obsY += 3;
    });

    yPosition += observationsHeight + 10;
  }

  // ==================== SECOES E PERGUNTAS ====================
  sections?.forEach((section) => {
    addTOCItem(section.title);
    
    ensureSpace(20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 79, 124);
    doc.text(section.title.toUpperCase(), marginLeft, yPosition);
    yPosition += SECTION_GAP;

    const sectionQuestions = questionsBySection[section.id] || [];
    
    sectionQuestions.forEach((question) => {
      const value = responseMap[question.id];

      if (question.question_type === "image_upload" && Array.isArray(value) && value.length > 0) {
        value.forEach((url: string, idx: number) => {
          allImages.push({ url, label: `${question.label} - Foto ${idx + 1}` });
        });

        ensureSpace(LINE_HEIGHT + BLOCK_GAP);

        doc.setFontSize(FONT_SIZE_LABEL);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(55, 65, 81);
        const labelText = `${question.label}: `;
        doc.text(labelText, marginLeft, yPosition);

        doc.setFont("helvetica", "bold");
        const labelW = doc.getTextWidth(labelText);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        doc.text(`${value.length} foto(s) anexada(s) - ver final do documento`, marginLeft + labelW, yPosition);
        
        yPosition += LINE_HEIGHT + BLOCK_GAP;
        return;
      }

      let displayValue = "-";
      if (value !== undefined && value !== null && value !== "") {
        if (question.question_type === "radio" || question.question_type === "select") {
          const options = question.options as { label: string; value: string }[] | undefined;
          const option = options?.find((opt) => opt.value === value);
          displayValue = option?.label || String(value);
        } else if (
          (question.question_type === "checkbox" || question.question_type === "multi_select") &&
          Array.isArray(value)
        ) {
          const options = question.options as { label: string; value: string }[] | undefined;
          displayValue = value
            .map((v: string) => {
              const option = options?.find((opt) => opt.value === v);
              return option?.label || v;
            })
            .join(", ");
        } else if (question.question_type === "multi_select") {
          // valor antigo string (legado)
          const options = question.options as { label: string; value: string }[] | undefined;
          const option = options?.find((opt) => opt.value === value);
          displayValue = option?.label || String(value);
        } else if (question.question_type === "slider") {
          displayValue = `${value}/5`;
        } else if (typeof value === "boolean") {
          displayValue = value ? "Sim" : "Nao";
        } else {
          displayValue = String(value);
        }
      }

      const labelText = `${question.label}: `;
      
      doc.setFontSize(FONT_SIZE_LABEL);
      doc.setFont("helvetica", "bold");
      const labelWidth = doc.getTextWidth(labelText);
      
      doc.setFontSize(FONT_SIZE_VALUE);
      doc.setFont("helvetica", "normal");
      const valueWidth = doc.getTextWidth(displayValue);
      
      const availableForValue = contentWidth - labelWidth - 4;
      const labelTooLong = labelWidth > contentWidth * 0.6;
      const valueIsShort = displayValue.length < 50 && !displayValue.includes("\n");
      const valueFits = valueWidth <= availableForValue;
      const useInlineMode = !labelTooLong && valueIsShort && valueFits;

      if (useInlineMode) {
        ensureSpace(LINE_HEIGHT + BLOCK_GAP);

        doc.setFontSize(FONT_SIZE_LABEL);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(55, 65, 81);
        doc.text(labelText, marginLeft, yPosition);

        doc.setFontSize(FONT_SIZE_VALUE);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text(displayValue, marginLeft + labelWidth, yPosition);

        yPosition += LINE_HEIGHT + BLOCK_GAP;
      } else {
        doc.setFontSize(FONT_SIZE_VALUE);
        const valueLines = doc.splitTextToSize(displayValue, contentWidth - 8);
        const totalBlockHeight = LINE_HEIGHT + (valueLines.length * LINE_HEIGHT) + BLOCK_GAP + 2;
        
        if (yPosition + totalBlockHeight > PAGE_BOTTOM && yPosition !== PAGE_TOP) {
          newPage();
        }

        doc.setFontSize(FONT_SIZE_LABEL);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(55, 65, 81);
        doc.text(labelText, marginLeft, yPosition);
        yPosition += LINE_HEIGHT;

        doc.setFontSize(FONT_SIZE_VALUE);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        
        for (const line of valueLines) {
          if (yPosition + LINE_HEIGHT > PAGE_BOTTOM) {
            newPage();
          }
          doc.text(line, marginLeft + 5, yPosition);
          yPosition += LINE_HEIGHT;
        }

        yPosition += BLOCK_GAP;
      }
    });

    yPosition += SECTION_GAP - BLOCK_GAP;
  });

  // ==================== LOCALIZACAO ====================
  if (visitData.latitude && visitData.longitude) {
    addTOCItem("Localizacao");
    
    doc.setFontSize(FONT_SIZE_VALUE);
    doc.setFont("helvetica", "normal");

    const coordsLine = `Coordenadas: ${Number(visitData.latitude).toFixed(6)}, ${Number(visitData.longitude).toFixed(6)}`;
    const addressLines = visitData.address
      ? doc.splitTextToSize(`Endereco: ${visitData.address}`, contentWidth - 10)
      : [];

    const padding = 8;
    const lineH = LINE_HEIGHT;
    const contentHeight = lineH + (addressLines.length > 0 ? lineH + (addressLines.length * lineH) : 0);
    const boxHeight = contentHeight + padding * 2;
    const neededHeight = 12 + boxHeight;

    ensureSpace(neededHeight);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 79, 124);
    doc.text("LOCALIZACAO", marginLeft, yPosition);
    yPosition += 8;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(marginLeft, yPosition, contentWidth, boxHeight, 2, 2, "F");

    doc.setFontSize(FONT_SIZE_VALUE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);

    let locY = yPosition + padding;
    doc.text(coordsLine, marginLeft + 5, locY);
    locY += lineH;

    if (addressLines.length > 0) {
      locY += 2;
      addressLines.forEach((line: string) => {
        doc.text(line, marginLeft + 5, locY);
        locY += lineH;
      });
    }

    yPosition += boxHeight + 8;
  }

  // ==================== FOTOS ANEXADAS ====================
  if (allImages.length > 0) {
    newPage();
    addTOCItem("Fotos Anexadas");

    const drawPhotosHeader = (title: string) => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(27, 79, 124);
      doc.text(title, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;
    };

    drawPhotosHeader("FOTOS ANEXADAS");

    const imageWidth = 80;
    const imageHeight = 60;
    const imageGap = 10;
    const captionFontSize = 7;
    const captionLineHeight = 4;
    const maxCaptionLines = 2;
    const rowGap = 12;

    let i = 0;
    while (i < allImages.length) {
      const rowImgs = allImages.slice(i, i + 2);

      doc.setFontSize(captionFontSize);
      doc.setFont("helvetica", "normal");

      const captionLinesPer = rowImgs.map((img) =>
        doc.splitTextToSize(img.label, imageWidth).slice(0, maxCaptionLines)
      );
      const maxLines = Math.max(...captionLinesPer.map((c) => c.length));
      const rowHeight = imageHeight + 5 + maxLines * captionLineHeight + rowGap;

      if (yPosition + rowHeight > PAGE_BOTTOM) {
        newPage();
        drawPhotosHeader("FOTOS ANEXADAS (continuacao)");
      }

      for (let col = 0; col < rowImgs.length; col++) {
        const img = rowImgs[col];
        const xPos = col === 0 ? marginLeft : marginLeft + imageWidth + imageGap;

        try {
          const base64 = await loadImageAsBase64(img.url);
          if (base64) {
            const format = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
            doc.addImage(base64, format, xPos, yPosition, imageWidth, imageHeight);
          } else {
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(249, 250, 251);
            doc.roundedRect(xPos, yPosition, imageWidth, imageHeight, 3, 3, "FD");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("Imagem nao disponivel", xPos + imageWidth / 2, yPosition + imageHeight / 2, {
              align: "center",
            });
          }
        } catch {
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(249, 250, 251);
          doc.roundedRect(xPos, yPosition, imageWidth, imageHeight, 3, 3, "FD");
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Erro ao carregar", xPos + imageWidth / 2, yPosition + imageHeight / 2, {
            align: "center",
          });
        }

        doc.setFontSize(captionFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);

        const captionLines = captionLinesPer[col];
        const captionY = yPosition + imageHeight + 5;
        captionLines.forEach((line: string, idx: number) => {
          doc.text(line, xPos, captionY + idx * captionLineHeight);
        });
      }

      yPosition += rowHeight;
      i += 2;
    }
  }

  // ==================== PREENCHER INDICE ====================
  doc.setPage(tocPageNumber);
  let tocY = tocStartY;
  
  tocItems.forEach((item, index) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    
    // Numero do item
    const itemNumber = `${index + 1}.`;
    doc.text(itemNumber, marginLeft, tocY);
    
    // Titulo
    doc.text(item.title, marginLeft + 10, tocY);
    
    // Linha pontilhada
    const titleWidth = doc.getTextWidth(item.title);
    const pageNumText = String(item.page);
    const pageNumWidth = doc.getTextWidth(pageNumText);
    const dotsStart = marginLeft + 10 + titleWidth + 3;
    const dotsEnd = pageWidth - marginRight - pageNumWidth - 3;
    
    doc.setTextColor(180, 180, 180);
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      doc.text(".", dotX, tocY);
      dotX += 2;
    }
    
    // Numero da pagina
    doc.setTextColor(27, 79, 124);
    doc.setFont("helvetica", "bold");
    doc.text(pageNumText, pageWidth - marginRight, tocY, { align: "right" });
    
    tocY += 8;
  });

  // ==================== RODAPE DECORATIVO EM TODAS AS PAGINAS ====================
  const totalPages = doc.internal.pages.length - 1;
  
  for (let i = 2; i <= totalPages; i++) { // Comecar da pagina 2 (pular capa)
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

  // Generate PDF blob and upload to storage
  const defaultFileName = `visita_${visitData.client_code}_${visitData.visit_date}.pdf`;
  const pdfFileName = fileName || defaultFileName;
  const pdfBlob = doc.output("blob");

  const storagePath = `${visitFormId}/${pdfFileName}`;
  const { error: uploadError } = await supabase.storage
    .from("visit-pdfs")
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true
    });

  if (uploadError) {
    console.error("Error uploading PDF:", uploadError);
  } else {
    await supabase
      .from("visit_forms")
      .update({ pdf_path: storagePath })
      .eq("id", visitFormId);
  }

  doc.save(pdfFileName);

  return doc;
}
