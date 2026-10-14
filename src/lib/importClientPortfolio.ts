import * as XLSX from "@e965/xlsx";
import { supabase } from "@/integrations/supabase/client";

/**
 * Importação de carteira de clientes por RCA (planilha com 1 linha por
 * cliente x RCA). Clientes que ainda não existem em clientes_cadastro são
 * criados; clientes já existentes não têm os dados alterados (preserva as
 * atualizações cadastrais feitas pela equipe). Em ambos os casos o vínculo
 * cliente <-> RCA é gravado em clientes_cadastro_rcas.
 */

export interface PortfolioRow {
  codcli: number;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  tipo_fj: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ramo_atividade: string | null;
  telefone: string | null;
  email: string | null;
  situacao: string | null;
  cod_rca: string;
  nome_rca: string | null;
}

export interface PortfolioPreview {
  rows: PortfolioRow[];
  newClients: number;
  /** Quantidade de clientes por RCA, ex: { "3916 - J16 - VAGO": 110 } */
  byRca: Record<string, number>;
  errors: string[];
}

const text = (v: unknown): string | null => {
  const s = v === undefined || v === null ? "" : String(v).trim();
  return s ? s : null;
};

const pick = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k];
  return undefined;
};

export const readPortfolioFile = async (file: File): Promise<PortfolioPreview> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: PortfolioRow[] = [];
  const errors: string[] = [];
  json.forEach((r, i) => {
    const line = i + 2;
    const codcli = Number(pick(r, "codcli", "CODCLI", "Código Cliente"));
    const codRca = text(pick(r, "cod_rca", "COD_RCA", "Cód. RCA"));
    const razao = text(pick(r, "razao_social", "RAZAO_SOCIAL", "cliente", "Razão Social"));
    if (!Number.isFinite(codcli) || codcli <= 0) return errors.push(`Linha ${line}: codcli inválido`);
    if (!codRca) return errors.push(`Linha ${line}: cod_rca vazio`);
    rows.push({
      codcli,
      razao_social: razao || String(codcli),
      nome_fantasia: text(pick(r, "nome_fantasia", "fantasia")),
      cnpj: text(pick(r, "cnpj", "cgcent")),
      tipo_fj: text(pick(r, "tipo_fj", "tipofj")),
      endereco: text(pick(r, "endereco")),
      bairro: text(pick(r, "bairro")),
      cidade: text(pick(r, "cidade")),
      uf: text(pick(r, "uf", "estado")),
      ramo_atividade: text(pick(r, "ramo_atividade", "ramo")),
      telefone: text(pick(r, "telefone", "telent")),
      email: text(pick(r, "email")),
      situacao: text(pick(r, "situacao")),
      cod_rca: codRca.replace(/\.0+$/, ""),
      nome_rca: text(pick(r, "nome_rca")),
    });
  });

  const byRca: Record<string, number> = {};
  for (const r of rows) {
    const key = r.nome_rca ? `${r.cod_rca} - ${r.nome_rca}` : r.cod_rca;
    byRca[key] = (byRca[key] || 0) + 1;
  }

  // Quantos clientes ainda não existem na base
  const codclis = [...new Set(rows.map((r) => r.codcli))];
  const existing = new Set<number>();
  for (let i = 0; i < codclis.length; i += 500) {
    const { data, error } = await supabase
      .from("clientes_cadastro")
      .select("codcli")
      .in("codcli", codclis.slice(i, i + 500));
    if (error) throw error;
    (data || []).forEach((c) => existing.add(Number(c.codcli)));
  }

  return { rows, newClients: codclis.filter((c) => !existing.has(c)).length, byRca, errors };
};

export const importPortfolio = async (rows: PortfolioRow[]) => {
  const BATCH = 500;

  // 1) Clientes novos (ignora os que já existem para não sobrescrever dados atualizados)
  const clients = new Map<number, PortfolioRow>();
  rows.forEach((r) => !clients.has(r.codcli) && clients.set(r.codcli, r));
  const clientRows = [...clients.values()].map(({ codcli, razao_social, nome_fantasia, cnpj, tipo_fj, endereco, bairro, cidade, uf, ramo_atividade, telefone, email, situacao, cod_rca, nome_rca }) => ({
    codcli, razao_social, nome_fantasia, cnpj, tipo_fj, endereco, bairro, cidade, uf, ramo_atividade, telefone, email, situacao, cod_rca, nome_rca,
  }));
  for (let i = 0; i < clientRows.length; i += BATCH) {
    const { error } = await supabase
      .from("clientes_cadastro")
      .upsert(clientRows.slice(i, i + BATCH), { onConflict: "codcli", ignoreDuplicates: true });
    if (error) throw error;
  }

  // 2) Vínculos cliente <-> RCA
  const links = rows.map((r) => ({ codcli: r.codcli, cod_rca: r.cod_rca, nome_rca: r.nome_rca }));
  for (let i = 0; i < links.length; i += BATCH) {
    const { error } = await supabase
      .from("clientes_cadastro_rcas")
      .upsert(links.slice(i, i + BATCH), { onConflict: "codcli,cod_rca", ignoreDuplicates: true });
    if (error) throw error;
  }
};
