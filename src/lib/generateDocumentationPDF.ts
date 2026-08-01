import { jsPDF } from "jspdf";

interface DocumentSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  display_order: number;
  updated_at: string;
}

interface TOCItem {
  title: string;
  page: number;
  sectionNumber: number;
  sectionKey: string;
}

// Layout constants
const MARGIN = 20;
const PAGE_TOP = 25;
const FOOTER_HEIGHT = 15;

// Colors (RGB)
const COLORS = {
  primary: [59, 130, 246] as const,      // Blue
  primaryDark: [37, 99, 235] as const,   // Darker blue
  headerBg: [241, 245, 249] as const,    // Light gray
  text: [30, 41, 59] as const,           // Dark slate
  textLight: [100, 116, 139] as const,   // Lighter text
  codeBg: [248, 250, 252] as const,      // Code background
  tableBorder: [226, 232, 240] as const, // Table border
  white: [255, 255, 255] as const,
  success: [34, 197, 94] as const,       // Green
  warning: [245, 158, 11] as const,      // Amber
  info: [59, 130, 246] as const,         // Blue
  successBg: [240, 253, 244] as const,   // Light green
  warningBg: [255, 251, 235] as const,   // Light amber
  infoBg: [239, 246, 255] as const,      // Light blue
};

// =====================
// EMOJI MAPPING SYSTEM
// =====================
const EMOJI_MAP: Record<string, string> = {
  // Setas e símbolos de navegação (mantidos como texto)
  '➡️': '->',
  '➡': '->',
  '⬅️': '<-',
  '⬅': '<-',
  '⬆️': '^',
  '⬆': '^',
  '⬇️': 'v',
  '⬇': 'v',
  '→': '->',
  '←': '<-',
  '↓': 'v',
  '↑': '^',
  // Todos os outros emojis são removidos (substituídos por string vazia)
  '✅': '',
  '🚧': '',
  '📌': '',
  '💡': '',
  '🌙': '',
  '📘': '',
  '🔧': '',
  '🛡️': '',
  '🛡': '',
  '📊': '',
  '🤖': '',
  '🎯': '',
  '👥': '',
  '🏆': '',
  '⚡': '',
  '🔗': '',
  '🏗️': '',
  '🏗': '',
  '📁': '',
  '🖥️': '',
  '🖥': '',
  '⚠️': '',
  '⚠': '',
  '💾': '',
  '🔐': '',
  '🔑': '',
  '📝': '',
  '📋': '',
  '🎨': '',
  '🚀': '',
  '📦': '',
  '🔒': '',
  '✨': '',
  '🎉': '',
  '⭐': '',
  '❌': '',
  '❓': '',
  '❗': '',
  '🔄': '',
};

// Replace emojis with text equivalents
function replaceEmojis(text: string): string {
  let result = text;
  for (const [emoji, replacement] of Object.entries(EMOJI_MAP)) {
    result = result.split(emoji).join(replacement);
  }
  return result;
}

// Sanitize text for PDF (remove unsupported characters but keep structure)
function sanitizeText(text: string): string {
  // First replace known emojis
  let result = replaceEmojis(text);
  
  // Remove remaining emojis and special characters not supported by PDF
  result = result
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{2B50}]/gu, '')
    .replace(/[^\x00-\x7F\u00C0-\u00FF\u0100-\u017F─│┌┐└┘├┤┬┴┼▶▼◀▲►◄→←↓↑]/g, '')
    .replace(/\s+/g, ' ')  // Consolidar espaços múltiplos
    .trim();
  
  return result;
}

// Clean markdown formatting for display
function cleanMarkdownFormatting(text: string): string {
  return sanitizeText(
    text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  );
}

// Preserve ASCII art characters for diagrams
function preserveAsciiArt(text: string): string {
  return replaceEmojis(text)
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↓/g, 'v')
    .replace(/↑/g, '^');
}

export async function generateDocumentationPDF(sections: DocumentSection[]): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN * 2;
  
  let yPos = PAGE_TOP;
  let currentPage = 1;
  const tocItems: TOCItem[] = [];
  const sectionPages: Map<number, number> = new Map();

  // Helper: Check and add new page if needed
  const checkNewPage = (requiredSpace: number = 20): boolean => {
    if (yPos + requiredSpace > pageHeight - FOOTER_HEIGHT - 10) {
      pdf.addPage();
      currentPage++;
      yPos = PAGE_TOP;
      return true;
    }
    return false;
  };

  // Helper: Draw page footer
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.textLight);
    
    // Left: Company name
    pdf.text("LOPES DISTRIBUIDORA", MARGIN, pageHeight - 10);
    
    // Center: Document title
    pdf.text("Documentacao do Sistema", pageWidth / 2, pageHeight - 10, { align: "center" });
    
    // Right: Page number
    pdf.text(`Pagina ${pageNum} de ${totalPages}`, pageWidth - MARGIN, pageHeight - 10, { align: "right" });
    
    // Separator line
    pdf.setDrawColor(...COLORS.tableBorder);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);
  };

  // =====================
  // COVER PAGE
  // =====================
  const drawCoverPage = () => {
    // Background header
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(0, 0, pageWidth, 80, 'F');
    
    // Decorative line
    pdf.setFillColor(...COLORS.primaryDark);
    pdf.rect(0, 80, pageWidth, 3, 'F');
    
    // Main title
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.text("DOCUMENTACAO DO SISTEMA", pageWidth / 2, 40, { align: "center" });
    
    // Subtitle
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    pdf.text("Sistema de Acompanhamento de Rotas Comerciais", pageWidth / 2, 55, { align: "center" });
    
    // Company name in header
    pdf.setFontSize(11);
    pdf.text("LOPES DISTRIBUIDORA", pageWidth / 2, 70, { align: "center" });
    
    // Info box
    const boxY = 100;
    const boxHeight = 65;
    pdf.setFillColor(...COLORS.headerBg);
    pdf.roundedRect(MARGIN, boxY, maxWidth, boxHeight, 3, 3, 'F');
    
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    
    const infoItems = [
      { label: "Data de Geracao:", value: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) },
      { label: "Versao:", value: "2.0" },
      { label: "Total de Secoes:", value: String(sections.length) },
    ];
    
    let infoY = boxY + 18;
    infoItems.forEach(item => {
      pdf.setFont("helvetica", "bold");
      pdf.text(item.label, MARGIN + 15, infoY);
      pdf.setFont("helvetica", "normal");
      pdf.text(item.value, MARGIN + 75, infoY);
      infoY += 15;
    });
    
    // Document description
    pdf.setTextColor(...COLORS.textLight);
    pdf.setFontSize(10);
    const description = "Este documento contem a documentacao completa do Sistema de Acompanhamento de Rotas Comerciais, incluindo guias de uso, especificacoes tecnicas e procedimentos operacionais.";
    const descLines = pdf.splitTextToSize(description, maxWidth - 20);
    pdf.text(descLines, pageWidth / 2, 195, { align: "center" });
    
    // Footer on cover
    pdf.setTextColor(...COLORS.textLight);
    pdf.setFontSize(9);
    pdf.text("Documento gerado automaticamente pelo sistema", pageWidth / 2, pageHeight - 20, { align: "center" });
  };

  // Status legend removed - technical documentation only

  // =====================
  // TABLE OF CONTENTS
  // =====================
  const drawTableOfContents = () => {
    pdf.addPage();
    currentPage++;
    yPos = PAGE_TOP;
    
    // Title
    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("INDICE", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    
    // Decorative line
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(1);
    pdf.line(pageWidth / 2 - 30, yPos, pageWidth / 2 + 30, yPos);
    
    yPos += 15;
    
    // TOC entries will be filled in later
    const tocStartY = yPos;
    const tocStartPage = currentPage;
    
    // Reserve space for TOC (estimate 12 pixels per entry)
    const estimatedTocHeight = sections.length * 12 + 20;
    const pagesNeeded = Math.ceil(estimatedTocHeight / (pageHeight - PAGE_TOP - FOOTER_HEIGHT - 20));
    
    for (let i = 0; i < pagesNeeded; i++) {
      if (i > 0) {
        pdf.addPage();
        currentPage++;
      }
    }
    
    return { tocStartY, tocStartPage };
  };

  // =====================
  // RENDER ALERT BOX
  // =====================
  const renderAlertBox = (content: string, type: 'info' | 'warning' | 'success') => {
    const colorMap = {
      info: { bg: COLORS.infoBg, border: COLORS.info, icon: 'i' },
      warning: { bg: COLORS.warningBg, border: COLORS.warning, icon: '!' },
      success: { bg: COLORS.successBg, border: COLORS.success, icon: 'v' },
    };
    
    const style = colorMap[type];
    const lines = pdf.splitTextToSize(sanitizeText(content), maxWidth - 25) as string[];
    const boxHeight = lines.length * 5 + 12;
    
    checkNewPage(boxHeight);
    
    // Background
    pdf.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
    pdf.roundedRect(MARGIN, yPos, maxWidth, boxHeight, 3, 3, 'F');
    
    // Left border
    pdf.setFillColor(style.border[0], style.border[1], style.border[2]);
    pdf.rect(MARGIN, yPos, 4, boxHeight, 'F');
    
    // Icon circle
    pdf.setFillColor(style.border[0], style.border[1], style.border[2]);
    pdf.circle(MARGIN + 12, yPos + boxHeight / 2, 5, 'F');
    pdf.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(style.icon, MARGIN + 12, yPos + boxHeight / 2 + 2, { align: "center" });
    
    // Content
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    lines.forEach((line: string, idx: number) => {
      pdf.text(line, MARGIN + 22, yPos + 8 + idx * 5);
    });
    
    yPos += boxHeight + 8;
  };

  // =====================
  // RENDER TABLE
  // =====================
  const renderTable = (headers: string[], data: string[][]) => {
    if (headers.length === 0) return;
    
    const colCount = headers.length;
    
    // Calculate column widths based on content
    const calculateColWidths = (): number[] => {
      const widths: number[] = [];
      const minWidth = 25;
      const maxColWidth = maxWidth / colCount * 1.5;
      
      pdf.setFontSize(9);
      
      for (let i = 0; i < colCount; i++) {
        let maxContentWidth = pdf.getTextWidth(sanitizeText(headers[i] || '')) + 6;
        
        data.forEach(row => {
          if (row[i]) {
            const cellWidth = pdf.getTextWidth(sanitizeText(row[i])) + 6;
            maxContentWidth = Math.max(maxContentWidth, cellWidth);
          }
        });
        
        widths.push(Math.min(Math.max(maxContentWidth, minWidth), maxColWidth));
      }
      
      // Normalize to fit maxWidth
      const totalWidth = widths.reduce((a, b) => a + b, 0);
      if (totalWidth > maxWidth) {
        const ratio = maxWidth / totalWidth;
        return widths.map(w => w * ratio);
      }
      
      return widths;
    };
    
    pdf.setFontSize(9);
    const colWidths = calculateColWidths();
    const cellPadding = 3;
    const lineHeight = 5;
    
    // Calculate row heights with word wrap
    const calculateRowHeight = (cells: string[]): number => {
      let maxLines = 1;
      cells.forEach((cell, i) => {
        const cellWidth = colWidths[i] - cellPadding * 2;
        const lines = pdf.splitTextToSize(sanitizeText(cell || ''), cellWidth);
        maxLines = Math.max(maxLines, lines.length);
      });
      return maxLines * lineHeight + cellPadding * 2;
    };
    
    // Calculate total table height
    const headerHeight = calculateRowHeight(headers);
    let totalTableHeight = headerHeight;
    const rowHeights: number[] = [];
    
    data.forEach(row => {
      const height = calculateRowHeight(row);
      rowHeights.push(height);
      totalTableHeight += height;
    });
    
    // Check if table fits, if not start new page
    if (yPos + Math.min(totalTableHeight, 100) > pageHeight - FOOTER_HEIGHT - 10) {
      checkNewPage(Math.min(totalTableHeight, 100));
    }
    
    const startX = MARGIN;
    let currentY = yPos;
    
    // Draw header row
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(startX, currentY, maxWidth, headerHeight, 'F');
    
    pdf.setTextColor(...COLORS.white);
    pdf.setFont("helvetica", "bold");
    
    let xOffset = startX;
    headers.forEach((header, i) => {
      const cellWidth = colWidths[i] - cellPadding * 2;
      const lines = pdf.splitTextToSize(sanitizeText(header || ''), cellWidth);
      let textY = currentY + cellPadding + lineHeight - 1;
      lines.forEach((line: string) => {
        pdf.text(line, xOffset + cellPadding, textY);
        textY += lineHeight;
      });
      xOffset += colWidths[i];
    });
    
    currentY += headerHeight;
    
    // Draw data rows
    pdf.setTextColor(...COLORS.text);
    pdf.setFont("helvetica", "normal");
    
    data.forEach((row, rowIdx) => {
      const rowHeight = rowHeights[rowIdx];
      
      // Check if row fits on current page
      if (currentY + rowHeight > pageHeight - FOOTER_HEIGHT - 10) {
        // Draw bottom border before page break
        pdf.setDrawColor(...COLORS.tableBorder);
        pdf.setLineWidth(0.5);
        pdf.line(startX, currentY, startX + maxWidth, currentY);
        
        pdf.addPage();
        currentPage++;
        currentY = PAGE_TOP;
        
        // Redraw header on new page
        pdf.setFillColor(...COLORS.primary);
        pdf.rect(startX, currentY, maxWidth, headerHeight, 'F');
        
        pdf.setTextColor(...COLORS.white);
        pdf.setFont("helvetica", "bold");
        
        xOffset = startX;
        headers.forEach((header, i) => {
          const cellWidth = colWidths[i] - cellPadding * 2;
          const lines = pdf.splitTextToSize(sanitizeText(header || ''), cellWidth);
          let textY = currentY + cellPadding + lineHeight - 1;
          lines.forEach((line: string) => {
            pdf.text(line, xOffset + cellPadding, textY);
            textY += lineHeight;
          });
          xOffset += colWidths[i];
        });
        
        currentY += headerHeight;
        pdf.setTextColor(...COLORS.text);
        pdf.setFont("helvetica", "normal");
      }
      
      // Alternating row background
      if (rowIdx % 2 === 0) {
        pdf.setFillColor(...COLORS.codeBg);
        pdf.rect(startX, currentY, maxWidth, rowHeight, 'F');
      }
      
      // Draw cell content
      xOffset = startX;
      row.forEach((cell, i) => {
        const cellWidth = colWidths[i] - cellPadding * 2;
        const lines = pdf.splitTextToSize(sanitizeText(cell || ''), cellWidth);
        let textY = currentY + cellPadding + lineHeight - 1;
        lines.forEach((line: string) => {
          pdf.text(line, xOffset + cellPadding, textY);
          textY += lineHeight;
        });
        xOffset += colWidths[i];
      });
      
      // Draw row border
      pdf.setDrawColor(...COLORS.tableBorder);
      pdf.setLineWidth(0.2);
      pdf.line(startX, currentY + rowHeight, startX + maxWidth, currentY + rowHeight);
      
      currentY += rowHeight;
    });
    
    // Draw table border
    pdf.setDrawColor(...COLORS.tableBorder);
    pdf.setLineWidth(0.5);
    pdf.rect(startX, yPos, maxWidth, currentY - yPos);
    
    // Draw column separators
    xOffset = startX;
    for (let i = 0; i < colCount - 1; i++) {
      xOffset += colWidths[i];
      pdf.setLineWidth(0.2);
      pdf.line(xOffset, yPos, xOffset, currentY);
    }
    
    yPos = currentY + 8;
  };

  // =====================
  // RENDER CODE BLOCK (preserves ASCII art)
  // =====================
  const renderCodeBlock = (lines: string[]) => {
    const codeLineHeight = 4;
    const padding = 6;
    const blockHeight = Math.min(lines.length * codeLineHeight + padding * 2, pageHeight - FOOTER_HEIGHT - yPos - 20);
    
    checkNewPage(Math.min(blockHeight, 60));
    
    // Background
    pdf.setFillColor(...COLORS.codeBg);
    pdf.roundedRect(MARGIN, yPos, maxWidth, blockHeight, 2, 2, 'F');
    
    // Border
    pdf.setDrawColor(...COLORS.tableBorder);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN, yPos, maxWidth, blockHeight, 2, 2, 'S');
    
    // Left accent bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(MARGIN, yPos, 3, blockHeight, 'F');
    
    // Code text - use courier and preserve ASCII art
    pdf.setFont("courier", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.text);
    
    let codeY = yPos + padding + 3;
    const maxLinesInBlock = Math.floor((blockHeight - padding * 2) / codeLineHeight);
    
    lines.slice(0, maxLinesInBlock).forEach(line => {
      // Preserve ASCII art - don't sanitize box-drawing characters
      const displayLine = preserveAsciiArt(line);
      
      // Truncate long lines
      const maxChars = Math.floor((maxWidth - padding * 2 - 5) / 1.8);
      const truncatedLine = displayLine.length > maxChars ? displayLine.substring(0, maxChars - 3) + '...' : displayLine;
      
      pdf.text(truncatedLine, MARGIN + padding + 3, codeY);
      codeY += codeLineHeight;
    });
    
    pdf.setFont("helvetica", "normal");
    yPos += blockHeight + 6;
  };

  // =====================
  // RENDER H1 HEADER
  // =====================
  const renderH1 = (text: string) => {
    checkNewPage(25);
    
    // Background bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(MARGIN - 5, yPos - 6, maxWidth + 10, 14, 'F');
    
    // White text
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(cleanMarkdownFormatting(text), MARGIN, yPos + 3);
    
    yPos += 18;
  };

  // =====================
  // RENDER H2 HEADER
  // =====================
  const renderH2 = (text: string) => {
    checkNewPage(18);
    
    // Left accent bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(MARGIN - 3, yPos - 5, 3, 12, 'F');
    
    // Blue text
    pdf.setTextColor(...COLORS.primaryDark);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(cleanMarkdownFormatting(text), MARGIN + 5, yPos + 3);
    
    yPos += 12;
  };

  // =====================
  // RENDER H3 HEADER
  // =====================
  const renderH3 = (text: string) => {
    checkNewPage(14);
    
    // Slate text with arrow
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(">" + " " + cleanMarkdownFormatting(text), MARGIN, yPos);
    
    yPos += 9;
  };

  // =====================
  // PARSE AND RENDER CONTENT
  // =====================
  const parseAndRenderContent = (content: string) => {
    const lines = content.split('\n');
    let inTable = false;
    let tableData: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Handle code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          if (codeLines.length > 0) {
            renderCodeBlock(codeLines);
          }
          codeLines = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
        }
        return;
      }
      
      if (inCodeBlock) {
        codeLines.push(line); // Keep original line with spaces
        return;
      }
      
      // Skip empty lines but add small spacing
      if (!trimmed) {
        if (inTable && tableData.length > 0) {
          renderTable(tableHeaders, tableData);
          tableData = [];
          tableHeaders = [];
          inTable = false;
        }
        yPos += 3;
        return;
      }

      // Detect alert/note boxes
      if (trimmed.toLowerCase().startsWith('> **nota:') || trimmed.toLowerCase().startsWith('> nota:')) {
        const alertContent = trimmed.replace(/^>\s*\*?\*?nota:?\*?\*?\s*/i, '');
        renderAlertBox(alertContent, 'info');
        return;
      }
      
      if (trimmed.toLowerCase().startsWith('> **aviso:') || trimmed.toLowerCase().startsWith('> **alerta:') || trimmed.toLowerCase().startsWith('> aviso:')) {
        const alertContent = trimmed.replace(/^>\s*\*?\*?(aviso|alerta):?\*?\*?\s*/i, '');
        renderAlertBox(alertContent, 'warning');
        return;
      }
      
      if (trimmed.toLowerCase().startsWith('> **importante:') || trimmed.toLowerCase().startsWith('> importante:')) {
        const alertContent = trimmed.replace(/^>\s*\*?\*?importante:?\*?\*?\s*/i, '');
        renderAlertBox(alertContent, 'success');
        return;
      }

      // Handle markdown tables
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim());
        
        // Skip separator rows
        if (cells.every(c => /^[-:]+$/.test(c))) {
          return;
        }
        
        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableData.push(cells);
        }
        return;
      }

      // If we were in a table, render it now
      if (inTable && tableData.length > 0) {
        renderTable(tableHeaders, tableData);
        tableData = [];
        tableHeaders = [];
        inTable = false;
      }

      // Handle H1 headers
      if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
        renderH1(trimmed.replace(/^#\s/, ''));
        return;
      }

      // Handle H2 headers
      if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
        renderH2(trimmed.replace(/^##\s/, ''));
        return;
      }

      // Handle H3 headers
      if (trimmed.startsWith('### ')) {
        renderH3(trimmed.replace(/^###\s/, ''));
        return;
      }

      // Handle bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        checkNewPage(10);
        pdf.setTextColor(...COLORS.text);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        
        const text = cleanMarkdownFormatting(trimmed.replace(/^[-*]\s/, ''));
        
        // Bullet point
        pdf.setFillColor(...COLORS.primary);
        pdf.circle(MARGIN + 3, yPos - 1.5, 1.2, 'F');
        
        const wrappedLines = pdf.splitTextToSize(text, maxWidth - 12);
        wrappedLines.forEach((wrappedLine: string) => {
          checkNewPage(6);
          pdf.text(wrappedLine, MARGIN + 10, yPos);
          yPos += 5;
        });
        return;
      }

      // Handle numbered lists
      const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)$/);
      if (numberedMatch) {
        checkNewPage(10);
        pdf.setTextColor(...COLORS.text);
        pdf.setFontSize(10);
        
        const num = numberedMatch[1];
        const text = cleanMarkdownFormatting(numberedMatch[2]);
        
        pdf.setFont("helvetica", "bold");
        pdf.text(`${num}.`, MARGIN, yPos);
        pdf.setFont("helvetica", "normal");
        
        const wrappedLines = pdf.splitTextToSize(text, maxWidth - 12);
        wrappedLines.forEach((wrappedLine: string) => {
          checkNewPage(6);
          pdf.text(wrappedLine, MARGIN + 10, yPos);
          yPos += 5;
        });
        return;
      }

      // Regular paragraph
      checkNewPage(10);
      pdf.setTextColor(...COLORS.text);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      const cleanText = cleanMarkdownFormatting(trimmed);
      
      const wrappedLines = pdf.splitTextToSize(cleanText, maxWidth);
      wrappedLines.forEach((wrappedLine: string) => {
        checkNewPage(6);
        pdf.text(wrappedLine, MARGIN, yPos);
        yPos += 5;
      });
    });

    // Render any remaining content
    if (inCodeBlock && codeLines.length > 0) {
      renderCodeBlock(codeLines);
    }
    if (inTable && tableData.length > 0) {
      renderTable(tableHeaders, tableData);
    }
  };

  // =====================
  // DRAW SECTION
  // =====================
  const drawSection = (section: DocumentSection, index: number) => {
    // Record page for TOC
    sectionPages.set(index, currentPage);
    
    // Section title with number
    checkNewPage(30);
    
    // Section header background
    pdf.setFillColor(...COLORS.headerBg);
    pdf.roundedRect(MARGIN - 5, yPos - 5, maxWidth + 10, 16, 2, 2, 'F');
    
    // Section number badge
    pdf.setFillColor(...COLORS.primary);
    pdf.circle(MARGIN + 8, yPos + 3, 7, 'F');
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(index + 1), MARGIN + 8, yPos + 6, { align: "center" });
    
    // Section title
    const cleanTitle = sanitizeText(section.title);
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(cleanTitle, MARGIN + 22, yPos + 6);
    
    yPos += 22;
    
    // Parse and render content
    parseAndRenderContent(section.content);
    
    yPos += 15;
  };

  // =====================
  // GENERATE PDF
  // =====================
  
  // 1. Draw cover page
  drawCoverPage();
  
  // 2. Status legend removed - technical documentation only
  
  // 3. Draw table of contents (placeholder)
  const { tocStartY, tocStartPage } = drawTableOfContents();
  
  // 4. Draw all sections
  sections.forEach((section, index) => {
    // Start each major section on a new page
    if (index === 0 || yPos > pageHeight / 2) {
      pdf.addPage();
      currentPage++;
      yPos = PAGE_TOP;
    }
    
    drawSection(section, index);
    
    tocItems.push({
      title: sanitizeText(section.title),
      page: sectionPages.get(index) || currentPage,
      sectionNumber: index + 1,
      sectionKey: section.section_key,
    });
  });
  
  // 5. Fill in TOC with actual page numbers
  const totalPages = pdf.getNumberOfPages();
  pdf.setPage(tocStartPage);
  
  let tocY = tocStartY;
  const tocPageHeight = pageHeight - FOOTER_HEIGHT - 20;
  let currentTocPage = tocStartPage;
  
  tocItems.forEach((item) => {
    if (tocY > tocPageHeight) {
      currentTocPage++;
      pdf.setPage(currentTocPage);
      tocY = PAGE_TOP;
    }
    
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(11);
    
    // Section number badge
    pdf.setFillColor(...COLORS.primary);
    pdf.circle(MARGIN + 4, tocY - 1, 4, 'F');
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(item.sectionNumber), MARGIN + 4, tocY + 1, { align: "center" });
    
    // Title
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const titleMaxWidth = maxWidth - 50;
    const truncatedTitle = item.title.length > 55 ? item.title.substring(0, 52) + '...' : item.title;
    pdf.text(truncatedTitle, MARGIN + 14, tocY);
    
    // Dotted line
    const titleWidth = pdf.getTextWidth(truncatedTitle);
    const dotsStart = MARGIN + 16 + titleWidth;
    const dotsEnd = pageWidth - MARGIN - 15;
    
    pdf.setTextColor(...COLORS.textLight);
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      pdf.text('.', dotX, tocY);
      dotX += 2;
    }
    
    // Page number
    pdf.setTextColor(...COLORS.primary);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(item.page), pageWidth - MARGIN, tocY, { align: "right" });
    
    tocY += 12;
  });
  
  // 6. Add footers to all pages (except cover)
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    drawPageFooter(i, totalPages);
  }

  // 7. Save PDF
  pdf.save("documentacao-sistema.pdf");
}
