import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import logoLopes from "@/assets/logo-lopes.png";

/**
 * Generic PDF generator for any form template (other than "visita" — that one
 * has its own dedicated, richer generator). It walks through the sections /
 * questions / responses and produces a clean, branded report.
 */

interface SubmissionRow {
  id: string;
  template_id: string;
  submitted_at: string;
  metadata: Record<string, any>;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
}

interface SectionRow {
  id: string;
  title: string;
  display_order: number;
}

interface QuestionRow {
  id: string;
  section_id: string;
  label: string;
  question_type: string;
  options: any;
  display_order: number;
  identification_role: string | null;
}

interface ResponseRow {
  question_id: string;
  response_value: any;
}


// ==================== Helpers de imagem ====================
function extractFormImagePath(input: string): string {
  if (!input) return "";
  if (!input.includes("/")) return input;
  try {
    const url = new URL(input, "http://dummy");
    const pathname = url.pathname;
    const m1 = pathname.match(/\/object\/(?:public|sign)\/form-images\/(.+)/);
    if (m1) return m1[1].split("?")[0];
    const m2 = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/form-images\/(.+)/);
    if (m2) return m2[1].split("?")[0];
  } catch {}
  return input;
}

async function loadImageAsBase64(imageInput: string): Promise<string | null> {
  try {
    const filePath = extractFormImagePath(imageInput);
    if (!filePath) return null;
    const { data, error } = await supabase.storage.from("form-images").download(filePath);
    if (error || !data) return null;
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(data);
    });
    if (!dataUrl) return null;
    if (dataUrl.startsWith("data:image/png") || dataUrl.startsWith("data:image/jpeg")) return dataUrl;
    return await new Promise<string | null>((resolve) => {
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
        try { resolve(canvas.toDataURL("image/jpeg", 0.92)); } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch { return null; }
}

function formatValue(question: QuestionRow, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "string" && value[0].includes("/")) {
      return `${value.length} imagem(ns)`;
    }
    return value.join(", ");
  }
  if (
    question.question_type === "select" ||
    question.question_type === "radio" ||
    question.question_type === "multi_select"
  ) {
    const opts = Array.isArray(question.options) ? question.options : [];
    if (Array.isArray(value)) {
      return value
        .map((v) => opts.find((o: any) => o?.value === v)?.label || String(v))
        .join(", ");
    }
    const found = opts.find((o: any) => o?.value === value);
    if (found?.label) return String(found.label);
  }
  if (question.question_type === "date" && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString("pt-BR");
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export async function generateGenericFormPDF(submissionId: string, opts?: { fileName?: string }) {
  const submissionsClient: any = supabase.from("form_submissions");
  const templatesClient: any = supabase.from("form_templates");
  const sectionsClient: any = supabase.from("form_sections");

  const { data: submission, error: subErr } = await submissionsClient
    .select("*")
    .eq("id", submissionId)
    .single();
  if (subErr || !submission) throw new Error("Não foi possível carregar o registro.");
  const sub = submission as SubmissionRow;

  const { data: template, error: tplErr } = await templatesClient
    .select("id, name, description")
    .eq("id", sub.template_id)
    .single();
  if (tplErr || !template) throw new Error("Template não encontrado.");
  const tpl = template as TemplateRow;

  const { data: sections, error: secErr } = await sectionsClient
    .select("id, title, display_order")
    .eq("template_id", tpl.id)
    .eq("is_active", true)
    .order("display_order");
  if (secErr) throw secErr;

  const sectionIds = (sections || []).map((s: any) => s.id);
  const { data: questions, error: qErr } = await supabase
    .from("form_questions")
    .select("*")
    .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true)
    .order("display_order");
  if (qErr) throw qErr;

  const { data: responses, error: rErr } = await supabase
    .from("form_responses")
    .select("question_id, response_value")
    .eq("submission_id", submissionId);
  if (rErr) throw rErr;

  const responseMap: Record<string, any> = {};
  (responses as ResponseRow[] | null)?.forEach((r) => {
    responseMap[r.question_id] = r.response_value;
  });

  const grouped: Record<string, QuestionRow[]> = {};
  (questions as QuestionRow[] | null)?.forEach((q) => {
    if (!grouped[q.section_id]) grouped[q.section_id] = [];
    grouped[q.section_id].push(q);
  });

  // ===== PDF =====
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Cover
  doc.setFillColor(220, 235, 250);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(155, 35, 53);
  doc.rect(0, 0, pageWidth, 8, "F");
  doc.setFillColor(27, 79, 124);
  doc.rect(0, 8, pageWidth, 4, "F");
  doc.addImage(logoLopes, "PNG", (pageWidth - 60) / 2, 50, 60, 60);

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 79, 124);
  doc.text(tpl.name.toUpperCase(), pageWidth / 2, 140, { align: "center" });

  doc.setDrawColor(27, 79, 124);
  doc.setLineWidth(1);
  doc.line(marginLeft + 30, 150, pageWidth - marginLeft - 30, 150);

  const dateFormatted = new Date(sub.submitted_at).toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(dateFormatted, pageWidth / 2, 165, { align: "center" });

  // Metadata box
  // Tenta achar a resposta da pergunta "Rede/Cliente" para usar como rótulo principal
  const redeQuestion = (questions as QuestionRow[] | null)?.find((q) =>
    /rede\s*\/?\s*cliente/i.test(q.label || "")
  );
  const redeValue = redeQuestion ? formatValue(redeQuestion, responseMap[redeQuestion.id]) : null;

  const metaEntries: [string, any][] = Object.entries(sub.metadata || {}).map(([k, v]) => {
    if (k.toLowerCase() === "manager" && redeValue && redeValue !== "—") {
      return ["Rede/Cliente", redeValue];
    }
    return [k, v];
  });
  if (metaEntries.length > 0 || sub.address) {
    const boxY = 190;
    const boxX = marginLeft + 20;
    const boxW = contentWidth - 40;
    const labelX = boxX + 10;
    const valueX = boxX + 60;
    const valueMaxW = boxX + boxW - valueX - 10;
    doc.setFontSize(11);

    // Pré-calcula linhas para dimensionar o quadro
    const rows: { label: string; lines: string[] }[] = [];
    metaEntries.slice(0, 5).forEach(([k, v]) => {
      rows.push({ label: `${k}:`, lines: doc.splitTextToSize(String(v), valueMaxW) });
    });
    if (sub.address) {
      rows.push({ label: "Endereço:", lines: doc.splitTextToSize(sub.address, valueMaxW) });
    }
    const totalLines = rows.reduce((acc, r) => acc + Math.max(1, r.lines.length), 0);
    const boxH = Math.max(80, 20 + totalLines * 6 + (rows.length - 1) * 4);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX, boxY, boxW, boxH, 5, 5, "F");

    let y = boxY + 14;
    rows.forEach(({ label, lines }) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(label, labelX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(27, 79, 124);
      lines.forEach((ln: string, idx: number) => {
        doc.text(ln, valueX, y + idx * 6);
      });
      y += Math.max(1, lines.length) * 6 + 4;
    });
  }

  doc.setFillColor(27, 79, 124);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("LOPES DISTRIBUIDORA", pageWidth / 2, pageHeight - 10, { align: "center" });

  // Content pages
  doc.addPage();
  let yPos = 20;

  const ensureSpace = (h: number) => {
    if (yPos + h > pageHeight - 25) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header on each content page
  const drawHeader = () => {
    doc.setFillColor(27, 79, 124);
    doc.rect(0, 0, pageWidth, 4, "F");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(tpl.name, marginLeft, 12);
    doc.text(dateFormatted, pageWidth - marginRight, 12, { align: "right" });
  };
  drawHeader();
  yPos = 22;

  for (const section of (sections || []) as any[]) {
    const list = grouped[section.id] || [];
    if (list.length === 0) continue;

    ensureSpace(15);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(marginLeft, yPos, contentWidth, 9, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 79, 124);
    doc.text(section.title.toUpperCase(), marginLeft + 4, yPos + 6);
    yPos += 14;

    for (const q of list) {
      const value = responseMap[q.id];

      if (q.question_type === "image_upload" && Array.isArray(value) && value.length > 0) {
        ensureSpace(10);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(55, 65, 81);
        doc.text(q.label, marginLeft + 2, yPos);
        yPos += 6;

        const imgW = 80;
        const imgH = 60;
        const gap = 8;
        const capH = 5;
        for (let i = 0; i < value.length; i += 2) {
          const rowImgs = value.slice(i, i + 2);
          const rowH = imgH + capH + 6;
          if (yPos + rowH > pageHeight - 25) {
            doc.addPage();
            drawHeader();
            yPos = 22;
          }
          for (let col = 0; col < rowImgs.length; col++) {
            const url = rowImgs[col];
            const xPos = marginLeft + 2 + col * (imgW + gap);
            try {
              const base64 = await loadImageAsBase64(url);
              if (base64) {
                const format = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
                doc.addImage(base64, format, xPos, yPos, imgW, imgH);
              } else {
                doc.setDrawColor(200, 200, 200);
                doc.setFillColor(249, 250, 251);
                doc.roundedRect(xPos, yPos, imgW, imgH, 3, 3, "FD");
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text("Imagem nao disponivel", xPos + imgW / 2, yPos + imgH / 2, { align: "center" });
              }
            } catch {
              doc.setDrawColor(200, 200, 200);
              doc.setFillColor(249, 250, 251);
              doc.roundedRect(xPos, yPos, imgW, imgH, 3, 3, "FD");
            }
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text(`Foto ${i + col + 1}`, xPos + imgW / 2, yPos + imgH + 4, { align: "center" });
          }
          yPos += rowH;
        }
        yPos += 3;
        continue;
      }

      const formatted = formatValue(q, value);
      const lines = doc.splitTextToSize(formatted, contentWidth - 4);
      const blockH = 5 + lines.length * 4 + 3;
      ensureSpace(blockH);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81);
      doc.text(q.label, marginLeft + 2, yPos);
      yPos += 4;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      lines.forEach((ln: string) => {
        doc.text(ln, marginLeft + 4, yPos);
        yPos += 4;
      });
      yPos += 3;
    }

    yPos += 4;
  }

  // Footer on every page
  const total = doc.internal.pages.length - 1;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Página ${p} de ${total}`, pageWidth - marginRight, pageHeight - 8, { align: "right" });
      doc.text("LOPES DISTRIBUIDORA", marginLeft, pageHeight - 8);
    }
  }

  const safeName = tpl.name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = opts?.fileName || `${safeName}_${submissionId.substring(0, 8)}.pdf`;
  doc.save(fileName);
}