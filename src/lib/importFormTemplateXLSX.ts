import * as XLSX from "@e965/xlsx";

export interface ParsedQuestion {
  section_title: string;
  display_order: number;
  label: string;
  question_type: string;
  options: Array<{ value: string; label: string }> | null;
  slider_config: { min: number; max: number; step: number } | null;
  is_required: boolean;
  question_ref: string;
  conditional_show_when: { question_ref: string; operator: string; value: string } | null;
}

export interface ParsedSection {
  title: string;
  display_order: number;
  questions: ParsedQuestion[];
}

export interface ParsedTemplate {
  sections: ParsedSection[];
  totalQuestions: number;
  warnings: string[];
}

/* ---------------------------- helpers ---------------------------- */

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const slugify = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "item";

const isYes = (v: unknown) => {
  const t = norm(v);
  return t === "sim" || t === "s" || t === "yes" || t === "true" || t === "x" || t === "1";
};

const TYPE_MAP: Record<string, string> = {
  // texto
  "texto": "text",
  "text": "text",
  "texto curto": "text",
  "texto longo": "textarea",
  "textarea": "textarea",
  "area de texto": "textarea",
  "paragrafo": "textarea",
  // data
  "data": "date",
  "date": "date",
  // múltipla
  "multipla escolha": "radio",
  "multipla": "radio",
  "radio": "radio",
  "escolha unica": "radio",
  "unica": "radio",
  "dropdown": "select",
  "select": "select",
  "lista suspensa": "select",
  // múltipla múltipla
  "multipla selecao": "multi_select",
  "multipla multipla": "multi_select",
  "multiple": "multi_select",
  "multiplas": "multi_select",
  "checkboxes": "multi_select",
  "multi select": "multi_select",
  "multi_select": "multi_select",
  // sim/não
  "sim/nao": "radio",
  "sim nao": "radio",
  "checkbox": "checkbox",
  "boolean": "checkbox",
  // escala
  "escala": "slider",
  "slider": "slider",
  "nota": "slider",
  // foto
  "foto": "image_upload",
  "fotos": "image_upload",
  "imagem": "image_upload",
  "imagens": "image_upload",
  "image": "image_upload",
  "image upload": "image_upload",
  "upload": "image_upload",
  "upload de imagens": "image_upload",
  // banco de dados
  "equipe": "team_select",
  "team": "team_select",
  "team select": "team_select",
  "gerente": "team_select",
  "supervisor": "team_select",
  "rca": "vendor_select",
  "vendedor": "vendor_select",
  "vendor": "vendor_select",
  "vendor select": "vendor_select",
};

/** Resolve o tipo, considerando dicas no label se "Tipo" estiver vazio. */
function resolveType(rawType: string, label: string, options: string): string {
  const t = norm(rawType);
  const l = norm(label);
  const optsNorm = norm(options);

  // Forte: marcação explícita "PEGUE/PUXE DO BANCO DE DADOS"
  if (optsNorm.includes("banco de dados")) {
    if (l.includes("rca") || l.includes("vendedor")) return "vendor_select";
    if (l.includes("gerente") || l.includes("supervisor") || l.includes("equipe")) return "team_select";
    // cod cliente visitado fica como texto
  }

  // Heurísticas por label (independente do tipo declarado)
  if (l.includes("nome do gerente") || l.includes("nome do supervisor")) return "team_select";
  if (l === "rca" || l.startsWith("cod rca")) return "vendor_select";
  if (l.includes("foto") || l.includes("imagem")) return "image_upload";
  if (l.startsWith("data")) return "date";

  // Tipo declarado
  if (TYPE_MAP[t]) {
    return TYPE_MAP[t];
  }

  // Se há opções mas tipo vazio
  if (options && options.includes(";")) return "radio";
  return "text";
}

function parseOptions(raw: string): Array<{ value: string; label: string }> | null {
  if (!raw) return null;
  const parts = raw.split(/\s*;\s*|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  // remove dicas do tipo "PEGUE DO BANCO DE DADOS"
  const filtered = parts.filter((p) => !/banco de dados|puxe do banco|pegue do banco/i.test(p));
  if (filtered.length === 0) return null;
  return filtered.map((label) => ({ value: slugify(label), label }));
}

function parseSliderFromOptions(raw: string): { min: number; max: number; step: number } | null {
  if (!raw) return { min: 1, max: 5, step: 1 };
  const nums = raw
    .split(/\s*[;|,]\s*/)
    .map((n) => Number(n.trim()))
    .filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return { min: 1, max: 5, step: 1 };
  return { min: Math.min(...nums), max: Math.max(...nums), step: 1 };
}

/* ---------------------------- parser principal ---------------------------- */

export async function parseFormTemplateXLSX(file: File): Promise<ParsedTemplate> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // Pega a primeira aba que tenha as colunas esperadas
  let rows: any[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
    if (json.length === 0) continue;
    const headers = Object.keys(json[0]).map((h) => norm(h));
    if (headers.some((h) => h.startsWith("perg")) && headers.some((h) => h.startsWith("sec"))) {
      rows = json;
      break;
    }
  }
  if (rows.length === 0) {
    throw new Error(
      "Nenhuma aba válida encontrada. A planilha deve ter colunas: Secao, Ordem, Pergunta, Tipo, Opcoes, Obrigatorio.",
    );
  }

  const warnings: string[] = [];

  // Normaliza chaves para acessar ignorando acentos/case
  const getCell = (row: any, ...keys: string[]) => {
    for (const target of keys) {
      const tNorm = norm(target);
      for (const k of Object.keys(row)) {
        if (norm(k) === tNorm) return row[k];
      }
    }
    return "";
  };

  type Raw = {
    section: string;
    order: number;
    label: string;
    type: string;
    options: string;
    required: boolean;
    showIfQuestion: string;
    showIfValue: string;
  };

  const raw: Raw[] = rows
    .map((row, idx) => {
      const section = String(getCell(row, "Secao", "Seção", "Section")).trim();
      const label = String(getCell(row, "Pergunta", "Question", "Label")).trim();
      if (!section && !label) return null;
      if (!label) {
        warnings.push(`Linha ${idx + 2} ignorada: pergunta vazia.`);
        return null;
      }
      const orderRaw = getCell(row, "Ordem", "Order", "Display Order");
      const order = Number(orderRaw) || idx + 1;
      const type = String(getCell(row, "Tipo", "Type")).trim();
      const options = String(getCell(row, "Opcoes", "Opções", "Options")).trim();
      const required = isYes(getCell(row, "Obrigatorio", "Obrigatório", "Required"));
      const showIfQuestion = String(
        getCell(
          row,
          "Mostrar se Pergunta",
          "Mostrar se pergunta",
          "Condicional Pergunta",
          "Show If Question",
        ),
      ).trim();
      const showIfValue = String(
        getCell(
          row,
          "Mostrar se Valor",
          "Mostrar se valor",
          "Condicional Valor",
          "Show If Value",
        ),
      ).trim();
      return {
        section: section || "Geral",
        order,
        label,
        type,
        options,
        required,
        showIfQuestion,
        showIfValue,
      };
    })
    .filter((r): r is Raw => r !== null);

  if (raw.length === 0) throw new Error("Nenhuma pergunta válida encontrada na planilha.");

  // Agrupa por seção (preserva ordem de aparição)
  const sectionsMap = new Map<string, ParsedSection>();
  let sectionOrder = 0;
  for (const r of raw) {
    if (!sectionsMap.has(r.section)) {
      sectionOrder++;
      sectionsMap.set(r.section, {
        title: r.section,
        display_order: sectionOrder,
        questions: [],
      });
    }
  }

  // Constrói perguntas
  // Mapeia raw -> question criada para resolver condicionais depois
  const rawToQuestion = new Map<Raw, ParsedQuestion>();
  for (const r of raw) {
    const sec = sectionsMap.get(r.section)!;
    const resolved = resolveType(r.type, r.label, r.options);

    let question_type = resolved;
    let options: ParsedQuestion["options"] = null;
    let slider_config: ParsedQuestion["slider_config"] = null;

    if (resolved === "multi_select") {
      options = parseOptions(r.options);
      if (!options) {
        warnings.push(`"${r.label}" é múltipla seleção mas não tem opções; convertido para texto.`);
        question_type = "text";
      }
    } else if (resolved === "radio" || resolved === "select") {
      options = parseOptions(r.options);
      if (!options) {
        warnings.push(`"${r.label}" é múltipla escolha mas não tem opções; convertido para texto.`);
        question_type = "text";
      }
    } else if (resolved === "slider") {
      slider_config = parseSliderFromOptions(r.options);
    }

    const question_ref = `q_${sec.questions.length + 1}_${slugify(r.label)}`;

    const created: ParsedQuestion = {
      section_title: r.section,
      display_order: sec.questions.length + 1,
      label: r.label,
      question_type,
      options,
      slider_config,
      is_required: r.required,
      question_ref,
      conditional_show_when: null,
    };
    sec.questions.push(created);
    rawToQuestion.set(r, created);
  }

  // ----- Condicionais MANUAIS via planilha -----
  // Marca seções que receberam ao menos uma condicional manual (para evitar duplicar com auto)
  const sectionsWithManualCond = new Set<string>();
  for (const r of raw) {
    if (!r.showIfQuestion || !r.showIfValue) continue;
    const dependent = rawToQuestion.get(r);
    if (!dependent) continue;
    const sec = sectionsMap.get(r.section)!;
    const triggerLabelNorm = norm(r.showIfQuestion);
    const trigger = sec.questions.find(
      (q) => norm(q.label) === triggerLabelNorm && q !== dependent,
    );
    if (!trigger) {
      warnings.push(
        `Condicional ignorada em "${r.label}": pergunta-gatilho "${r.showIfQuestion}" não encontrada na seção "${r.section}".`,
      );
      continue;
    }
    let value = r.showIfValue;
    if (trigger.options) {
      const opt = trigger.options.find(
        (o) => norm(o.label) === norm(r.showIfValue) || norm(o.value) === norm(r.showIfValue),
      );
      if (opt) value = opt.value;
      else
        warnings.push(
          `Condicional em "${r.label}": valor "${r.showIfValue}" não corresponde a uma opção de "${trigger.label}". Usando o texto literal.`,
        );
    }
    dependent.conditional_show_when = {
      question_ref: trigger.question_ref,
      operator: "equals",
      value,
    };
    dependent.is_required = false;
    sectionsWithManualCond.add(r.section);
  }

  // ----- Auto-condicionais: Plano de Ação (fallback se a seção não tem condicional manual) -----
  for (const sec of sectionsMap.values()) {
    if (sectionsWithManualCond.has(sec.title)) continue;
    const trigger = sec.questions.find((q) =>
      norm(q.label).includes("plano de acao") && norm(q.label).includes("gerado"),
    );
    if (!trigger || !trigger.options) continue;
    const simOpt = trigger.options.find((o) => norm(o.label) === "sim");
    if (!simOpt) continue;

    const triggerIdx = sec.questions.indexOf(trigger);
    const dependents = sec.questions
      .slice(triggerIdx + 1)
      .filter((q) => {
        const l = norm(q.label);
        return (
          l.includes("qual plano") ||
          l === "responsavel" ||
          l.startsWith("responsavel") ||
          l === "prazo" ||
          l.startsWith("data do plano") ||
          l === "data do plano"
        );
      });

    for (const dep of dependents) {
      dep.conditional_show_when = {
        question_ref: trigger.question_ref,
        operator: "equals",
        value: simOpt.value,
      };
      dep.is_required = false; // condicional → não obriga
    }
  }

  const sections = Array.from(sectionsMap.values());
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);

  return { sections, totalQuestions, warnings };
}