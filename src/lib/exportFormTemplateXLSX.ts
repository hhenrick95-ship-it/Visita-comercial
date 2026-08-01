import * as XLSX from "@e965/xlsx";
import { supabase } from "@/integrations/supabase/client";

/**
 * Exporta um (ou todos) os templates de formulário para um Excel
 * em FORMATO SIMPLES, fácil de editar por quem não conhece o sistema.
 *
 * Estrutura do arquivo:
 *   - Aba "INSTRUÇÕES":   guia rápido em linguagem natural.
 *   - Aba "Configurações": 1 linha por formulário (nome, descrição, etc.).
 *   - Aba "Formulário":   1 linha por pergunta — colunas:
 *       Seção | Ordem | Pergunta | Tipo | Opções | Obrigatório
 */

// Mapeia o tipo interno do banco para o rótulo amigável em português
function typeToLabel(internalType: string, questionLabel: string): string {
  const l = (questionLabel || "").toLowerCase();
  switch (internalType) {
    case "text": return "Texto";
    case "textarea": return "Texto longo";
    case "date": return "Data";
    case "radio":
    case "select":
      return "Múltipla escolha";
    case "multi_select": return "Múltipla seleção";
    case "checkbox": return "Sim/Não";
    case "slider": return "Escala";
    case "image_upload": return "Foto";
    case "team_select":
      // Diferencia Gerente vs Supervisor pelo label, quando possível
      if (l.includes("supervisor")) return "Supervisor";
      return "Gerente";
    case "vendor_select": return "RCA";
    default: return internalType;
  }
}

// Converte options [{value,label}] em string "Sim; Não; Talvez"
function optionsToString(options: any, sliderConfig: any, type: string): string {
  if (type === "slider" && sliderConfig) {
    const min = Number(sliderConfig.min ?? 1);
    const max = Number(sliderConfig.max ?? 5);
    const step = Number(sliderConfig.step ?? 1) || 1;
    const nums: number[] = [];
    for (let n = min; n <= max; n += step) nums.push(n);
    return nums.join("; ");
  }
  if (Array.isArray(options) && options.length > 0) {
    return options.map((o: any) => String(o.label ?? o.value ?? "")).join("; ");
  }
  return "";
}

export async function exportFormTemplateToXLSX(templateId?: string) {
  // 1. Carrega template(s)
  let templatesQuery = supabase.from("form_templates" as any).select("*");
  if (templateId) templatesQuery = templatesQuery.eq("id", templateId);
  const { data: templates, error: tErr } = await templatesQuery;
  if (tErr) throw tErr;
  if (!templates || templates.length === 0) throw new Error("Nenhum template encontrado");

  const templateIds = (templates as any[]).map((t) => t.id);

  // 2. Carrega seções
  const { data: sections, error: sErr } = await supabase
    .from("form_sections")
    .select("*")
    .in("template_id", templateIds)
    .order("display_order");
  if (sErr) throw sErr;

  const sectionIds = (sections || []).map((s: any) => s.id);

  // 3. Carrega perguntas
  const { data: questions, error: qErr } = sectionIds.length
    ? await supabase
        .from("form_questions")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order")
    : { data: [] as any[], error: null };
  if (qErr) throw qErr;

  const sectionById = new Map<string, any>(
    (sections || []).map((s: any) => [s.id, s]),
  );
  const templateById = new Map<string, any>(
    (templates as any[]).map((t) => [t.id, t]),
  );

  // 4. Aba "Configurações" (1 linha por formulário)
  const configRows = (templates as any[]).map((t) => ({
    "Nome do formulário": t.name || "",
    "Descrição": t.description || "",
    "Gera PDF?": t.generates_pdf ? "Sim" : "Não",
    "Pede localização?": t.requires_geolocation ? "Sim" : "Não",
  }));

  // 5. Aba "Formulário" (1 linha por pergunta)
  // Quando há apenas 1 template, omitimos a coluna "Formulário" para ficar mais limpo
  const isSingle = (templates as any[]).length === 1;
  let globalOrder = 0;
  const formRows = (questions || []).map((q: any) => {
    globalOrder++;
    const sec = sectionById.get(q.section_id);
    const tpl = sec ? templateById.get(sec.template_id) : null;
    const row: Record<string, any> = {};
    if (!isSingle) row["Formulário"] = tpl?.name || "";
    row["Seção"] = sec?.title || "Geral";
    row["Ordem"] = globalOrder;
    row["Pergunta"] = q.label || "";
    row["Tipo"] = typeToLabel(q.question_type, q.label || "");
    row["Opções"] = optionsToString(q.options, q.slider_config, q.question_type);
    row["Obrigatório"] = q.is_required ? "Sim" : "Não";
    return row;
  });

  // 6. Aba "INSTRUÇÕES" — guia simples
  const instructions: Array<Array<string>> = [
    ["📘 COMO PREENCHER ESTE MODELO"],
    [],
    ["Esta planilha tem 3 abas. Você só precisa editar 'Configurações' e 'Formulário'."],
    [],
    ["1) ABA 'Configurações'"],
    ["", "Defina o nome, descrição e configurações gerais do formulário."],
    [],
    ["2) ABA 'Formulário' — uma linha por pergunta"],
    ["Seção", "Agrupa perguntas (ex: 'Identificação', 'Avaliação', 'Fotos')."],
    ["Ordem", "Número sequencial. Pode deixar em branco — usaremos a ordem das linhas."],
    ["Pergunta", "O texto exato que aparecerá para quem preenche."],
    ["Tipo", "Veja a tabela de tipos abaixo."],
    ["Opções", "Apenas para Múltipla escolha, Sim/Não e Escala. Separe por ponto-e-vírgula. Ex: 'Sim; Não' ou 'Ótimo; Bom; Ruim'."],
    ["Obrigatório", "'Sim' ou 'Não'."],
    [],
    ["3) TIPOS DISPONÍVEIS"],
    ["Texto", "Resposta curta em uma linha."],
    ["Texto longo", "Resposta com várias linhas (parágrafo)."],
    ["Data", "Seletor de data."],
    ["Múltipla escolha", "Escolher 1 entre várias opções. Preencha 'Opções'."],
    ["Sim/Não", "Resposta sim ou não."],
    ["Escala", "Nota numérica. Em 'Opções' coloque os números: '1;2;3;4;5'."],
    ["Foto", "Upload de uma ou mais fotos."],
    ["Gerente", "Lista automática de gerentes (puxa do sistema)."],
    ["Supervisor", "Lista automática de supervisores (puxa do sistema)."],
    ["RCA", "Lista automática de RCAs do gestor selecionado."],
    [],
    ["4) PLANO DE AÇÃO (regra automática)"],
    ["", "Se você criar uma pergunta chamada 'Plano de ação gerado?' com opções 'Sim; Não',"],
    ["", "as perguntas seguintes da mesma seção (ex: 'Qual o plano?', 'Responsável', 'Prazo')"],
    ["", "só aparecem quando o usuário responder 'Sim'. Não precisa configurar nada."],
    [],
    ["💡 DICA", "Edite este arquivo no Excel ou Google Sheets e reimporte para criar/atualizar o formulário."],
  ];

  // 7. Monta o workbook
  const wb = XLSX.utils.book_new();

  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 22 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "INSTRUÇÕES");

  const wsCfg = XLSX.utils.json_to_sheet(configRows);
  wsCfg["!cols"] = [{ wch: 32 }, { wch: 50 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsCfg, "Configurações");

  const wsForm = XLSX.utils.json_to_sheet(formRows);
  wsForm["!cols"] = isSingle
    ? [{ wch: 22 }, { wch: 8 }, { wch: 50 }, { wch: 18 }, { wch: 40 }, { wch: 14 }]
    : [{ wch: 26 }, { wch: 22 }, { wch: 8 }, { wch: 50 }, { wch: 18 }, { wch: 40 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsForm, "Formulário");

  // 8. Download
  const filename = templateId
    ? `formulario_${(templates as any[])[0]?.slug || "template"}.xlsx`
    : `formularios_export.xlsx`;

  XLSX.writeFile(wb, filename);
}
