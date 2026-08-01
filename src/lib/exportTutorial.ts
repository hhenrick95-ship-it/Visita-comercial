import jsPDF from "jspdf";
import PptxGenJS from "pptxgenjs";
import type { SlideData } from "@/components/tutorial/TutorialSlides";

// ─── PDF Export ────────────────────────────────────────────────

export async function exportTutorialPDF(slides: SlideData[]) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [1920, 1080] });
  const W = 1920;
  const H = 1080;

  for (let i = 0; i < slides.length; i++) {
    if (i > 0) pdf.addPage([W, H], "landscape");
    const s = slides[i];
    drawPDFSlide(pdf, s, i + 1, slides.length, W, H);
  }

  pdf.save("tutorial-store-check-sync.pdf");
}

function drawPDFSlide(pdf: jsPDF, s: SlideData, num: number, total: number, W: number, H: number) {
  // Background
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, W, H, "F");

  // Footer
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255, 80);
  pdf.text(`${num} / ${total}`, W / 2, H - 30, { align: "center" });
  pdf.text("LOPES DISTRIBUIDORA", 60, H - 30);

  // Block badge
  if (s.block) {
    pdf.setFontSize(16);
    pdf.setTextColor(148, 163, 184); // slate-400
    pdf.text(s.block.toUpperCase(), W - 60, 50, { align: "right" });
  }

  pdf.setTextColor(255, 255, 255);

  switch (s.type) {
    case "cover":
      drawCover(pdf, s, W, H);
      break;
    case "content":
      drawContent(pdf, s, W, H);
      break;
    case "table":
      drawTable(pdf, s, W, H);
      break;
    case "diagram":
      drawDiagram(pdf, s, W, H);
      break;
    case "highlight":
      drawHighlight(pdf, s, W, H);
      break;
  }
}

function drawCover(pdf: jsPDF, s: SlideData, W: number, H: number) {
  pdf.setFontSize(72);
  pdf.setFont("helvetica", "bold");
  pdf.text(s.title, W / 2, H / 2 - 40, { align: "center" });
  if (s.subtitle) {
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "normal");
    const lines = s.subtitle.split("\n");
    lines.forEach((line, i) => {
      pdf.text(line, W / 2, H / 2 + 40 + i * 40, { align: "center" });
    });
  }
}

function drawContent(pdf: jsPDF, s: SlideData, W: number, H: number) {
  const contentW = s.screenshotUrl || (s.screenshots && s.screenshots.length > 0) ? W * 0.55 : W - 120;
  
  pdf.setFontSize(42);
  pdf.setFont("helvetica", "bold");
  pdf.text(s.title, 80, 120);

  // Divider line
  pdf.setDrawColor(59, 130, 246); // blue-500
  pdf.setLineWidth(4);
  pdf.line(80, 140, 400, 140);

  if (s.items) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(24);
    s.items.forEach((item, i) => {
      const y = 200 + i * 70;
      // Bullet
      pdf.setFillColor(59, 130, 246);
      pdf.circle(100, y - 6, 8, "F");
      // Text
      pdf.setTextColor(226, 232, 240); // slate-200
      const lines = pdf.splitTextToSize(item.text, contentW - 140);
      pdf.text(lines, 125, y);
    });
  }

  pdf.setTextColor(255, 255, 255);
}

function drawTable(pdf: jsPDF, s: SlideData, W: number, H: number) {
  pdf.setFontSize(42);
  pdf.setFont("helvetica", "bold");
  pdf.text(s.title, 80, 120);

  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(4);
  pdf.line(80, 140, 400, 140);

  if (!s.table) return;
  const { headers, rows } = s.table;
  const cols = headers.length;
  const tableW = W - 160;
  const colW = tableW / cols;
  const startY = 200;
  const rowH = 60;

  // Header
  pdf.setFillColor(30, 41, 59); // slate-800
  pdf.rect(80, startY, tableW, rowH, "F");
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(148, 163, 184);
  headers.forEach((h, j) => {
    pdf.text(h, 80 + j * colW + 20, startY + 38);
  });

  // Rows
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(226, 232, 240);
  rows.forEach((row, i) => {
    const y = startY + (i + 1) * rowH;
    if (i % 2 === 0) {
      pdf.setFillColor(15, 23, 42);
    } else {
      pdf.setFillColor(22, 33, 52);
    }
    pdf.rect(80, y, tableW, rowH, "F");
    row.forEach((cell, j) => {
      pdf.text(cell, 80 + j * colW + 20, y + 38);
    });
  });
}

function drawDiagram(pdf: jsPDF, s: SlideData, W: number, H: number) {
  pdf.setFontSize(42);
  pdf.setFont("helvetica", "bold");
  pdf.text(s.title, 80, 120);

  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(4);
  pdf.line(80, 140, 400, 140);

  if (s.diagramNodes) {
    const nodeH = 70;
    const nodeW = 600;
    const startX = (W - nodeW) / 2;
    const startY = 220;
    const gap = 30;

    s.diagramNodes.forEach((node, i) => {
      const y = startY + i * (nodeH + gap);
      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(startX, y, nodeW, nodeH, 12, 12, "F");
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text(node.label, startX + nodeW / 2, y + 42, { align: "center" });

      // Arrow
      if (i < s.diagramNodes!.length - 1) {
        pdf.setFillColor(100, 116, 139);
        const arrowX = startX + nodeW / 2;
        const arrowY = y + nodeH;
        pdf.triangle(arrowX - 10, arrowY + 5, arrowX + 10, arrowY + 5, arrowX, arrowY + gap - 5, "F");
      }
    });
  }

  if (s.subtitle) {
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    const lines = s.subtitle.split("\n");
    const startY = s.diagramNodes ? 220 + s.diagramNodes.length * 100 + 40 : 220;
    lines.forEach((line, i) => {
      pdf.text(line, W / 2, startY + i * 32, { align: "center" });
    });
  }
}

function drawHighlight(pdf: jsPDF, s: SlideData, W: number, H: number) {
  pdf.setFontSize(42);
  pdf.setFont("helvetica", "bold");
  pdf.text(s.title, W / 2, 150, { align: "center" });

  if (s.highlightValue) {
    pdf.setFontSize(120);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(59, 130, 246);
    pdf.text(s.highlightValue, W / 2, H / 2 - 20, { align: "center" });
  }

  if (s.highlightLabel) {
    pdf.setFontSize(32);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    pdf.text(s.highlightLabel, W / 2, H / 2 + 60, { align: "center" });
  }

  if (s.highlightDescription) {
    pdf.setFontSize(22);
    pdf.setTextColor(203, 213, 225);
    const lines = pdf.splitTextToSize(s.highlightDescription, W * 0.6);
    pdf.text(lines, W / 2, H / 2 + 130, { align: "center" });
  }

  pdf.setTextColor(255, 255, 255);
}

// ─── PPTX Export ───────────────────────────────────────────────

export async function exportTutorialPPTX(slides: SlideData[]) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "LOPES DISTRIBUIDORA";
  pptx.title = "Tutorial - Store Check Sync";

  const BG = "0F172A";
  const BLUE = "3B82F6";
  const GRAY = "94A3B8";
  const LIGHT = "E2E8F0";

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    // Footer
    slide.addText(`${i + 1} / ${slides.length}`, {
      x: 5.5, y: 6.9, w: 2.33, h: 0.4, fontSize: 10,
      color: GRAY, align: "center",
    });
    slide.addText("LOPES DISTRIBUIDORA", {
      x: 0.3, y: 6.9, w: 3, h: 0.4, fontSize: 10, color: GRAY,
    });

    // Block badge
    if (s.block) {
      slide.addText(s.block.toUpperCase(), {
        x: 9, y: 0.2, w: 4, h: 0.4, fontSize: 10, color: GRAY, align: "right",
      });
    }

    switch (s.type) {
      case "cover":
        slide.addText(s.title, {
          x: 0.5, y: 2.5, w: 12.33, h: 1.5, fontSize: 48, bold: true,
          color: "FFFFFF", align: "center",
        });
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 2, y: 4.2, w: 9.33, h: 2, fontSize: 18,
            color: GRAY, align: "center",
          });
        }
        break;

      case "content": {
        slide.addText(s.title, {
          x: 0.5, y: 0.5, w: 8, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF",
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 1.35, w: 2.5, h: 0.06, fill: { color: BLUE },
        });
        if (s.items) {
          const contentW = s.screenshotUrl || (s.screenshots && s.screenshots.length > 0) ? 6.5 : 12;
          s.items.forEach((item, j) => {
            slide.addText([
              { text: "● ", options: { color: BLUE, bold: true } },
              { text: item.text, options: { color: LIGHT } },
            ], {
              x: 0.5, y: 1.7 + j * 0.85, w: contentW, h: 0.75, fontSize: 16, valign: "top",
            });
          });
        }
        break;
      }

      case "table": {
        slide.addText(s.title, {
          x: 0.5, y: 0.5, w: 8, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF",
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 1.35, w: 2.5, h: 0.06, fill: { color: BLUE },
        });
        if (s.table) {
          const tableRows: PptxGenJS.TableRow[] = [];
          // Header row
          tableRows.push(s.table.headers.map(h => ({
            text: h,
            options: { bold: true, color: GRAY, fill: { color: "1E293B" }, fontSize: 14, align: "left" as const },
          })));
          // Data rows
          s.table.rows.forEach((row, ri) => {
            tableRows.push(row.map(cell => ({
              text: cell,
              options: {
                color: LIGHT, fontSize: 14, align: "left" as const,
                fill: { color: ri % 2 === 0 ? BG : "162134" },
              },
            })));
          });
          slide.addTable(tableRows, {
            x: 0.5, y: 1.7, w: 12.33, colW: Array(s.table.headers.length).fill(12.33 / s.table.headers.length),
            border: { type: "solid", pt: 0.5, color: "334155" },
            rowH: 0.55,
          });
        }
        break;
      }

      case "diagram": {
        slide.addText(s.title, {
          x: 0.5, y: 0.5, w: 8, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF",
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 1.35, w: 2.5, h: 0.06, fill: { color: BLUE },
        });
        if (s.diagramNodes) {
          const nodeW = 5;
          const nodeH = 0.65;
          const startX = (13.33 - nodeW) / 2;
          s.diagramNodes.forEach((node, j) => {
            const y = 1.8 + j * 1.0;
            slide.addShape(pptx.ShapeType.roundRect, {
              x: startX, y, w: nodeW, h: nodeH,
              fill: { color: BLUE }, rectRadius: 0.1,
            });
            slide.addText(node.label, {
              x: startX, y, w: nodeW, h: nodeH,
              fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            });
            if (j < s.diagramNodes!.length - 1) {
              slide.addText("▼", {
                x: startX + nodeW / 2 - 0.2, y: y + nodeH, w: 0.4, h: 0.35,
                fontSize: 14, color: GRAY, align: "center",
              });
            }
          });
        }
        if (s.subtitle) {
          const startY = s.diagramNodes ? 1.8 + s.diagramNodes.length * 1.0 + 0.3 : 2.5;
          slide.addText(s.subtitle, {
            x: 1.5, y: startY, w: 10.33, h: 1.5,
            fontSize: 14, color: GRAY, align: "center",
          });
        }
        break;
      }

      case "highlight": {
        slide.addText(s.title, {
          x: 0.5, y: 0.8, w: 12.33, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF", align: "center",
        });
        if (s.highlightValue) {
          slide.addText(s.highlightValue, {
            x: 2, y: 2.5, w: 9.33, h: 1.5, fontSize: 72, bold: true, color: BLUE, align: "center",
          });
        }
        if (s.highlightLabel) {
          slide.addText(s.highlightLabel, {
            x: 2, y: 4.2, w: 9.33, h: 0.6, fontSize: 20, color: GRAY, align: "center",
          });
        }
        if (s.highlightDescription) {
          slide.addText(s.highlightDescription, {
            x: 2.5, y: 5, w: 8.33, h: 1.5, fontSize: 14, color: LIGHT, align: "center",
          });
        }
        break;
      }
    }
  }

  await pptx.writeFile({ fileName: "tutorial-store-check-sync.pptx" });
}
