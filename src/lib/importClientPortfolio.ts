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

export interface PortfolioImportResult {
  clients: number;
  links: number;
  vendorsUpdated: number;
}

interface ExistingClient {
  codcli: number;
  nome_fantasia: string | null;
  ramo_atividade: string | null;
  telefone: string | null;
  email: string | null;
  qtd_checkouts: number | null;
  fotos: string[] | null;
  status_atualizacao: string | null;
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

export const importPortfolio = async (rows: PortfolioRow[]): Promise<PortfolioImportResult> => {
  const BATCH = 500;

  // Uma linha representa um vínculo cliente x RCA. Remove duplicatas da planilha.
  const uniqueLinks = new Map<string, PortfolioRow>();
  rows.forEach((row) => uniqueLinks.set(`${row.codcli}|${row.cod_rca}`, row));
  const normalizedRows = [...uniqueLinks.values()];

  // A primeira ocorrência do cliente é a rota principal informada pelo ERP.
  const clients = new Map<number, PortfolioRow>();
  normalizedRows.forEach((row) => !clients.has(row.codcli) && clients.set(row.codcli, row));

  // Lê o estado atual para preservar respostas coletadas em campo e fotos.
  const existing = new Map<number, ExistingClient>();
  const clientCodes = [...clients.keys()];
  for (let i = 0; i < clientCodes.length; i += BATCH) {
    const { data, error } = await supabase
      .from("clientes_cadastro")
      .select("codcli,nome_fantasia,ramo_atividade,telefone,email,qtd_checkouts,fotos,status_atualizacao")
      .in("codcli", clientCodes.slice(i, i + BATCH));
    if (error) throw error;
    (data || []).forEach((client) => existing.set(Number(client.codcli), client as ExistingClient));
  }

  const clientRows = [...clients.values()].map((source) => {
    const current = existing.get(source.codcli);
    const preserveSurvey = current?.status_atualizacao === "atualizado";
    return {
      codcli: source.codcli,
      razao_social: source.razao_social,
      nome_fantasia: preserveSurvey ? current.nome_fantasia : source.nome_fantasia,
      cnpj: source.cnpj,
      tipo_fj: source.tipo_fj,
      endereco: source.endereco,
      bairro: source.bairro,
      cidade: source.cidade,
      uf: source.uf,
      ramo_atividade: preserveSurvey ? current.ramo_atividade : source.ramo_atividade,
      telefone: preserveSurvey ? current.telefone : source.telefone,
      email: preserveSurvey ? current.email : source.email,
      situacao: source.situacao,
      cod_rca: source.cod_rca,
      nome_rca: source.nome_rca,
      qtd_checkouts: current?.qtd_checkouts ?? null,
      fotos: current?.fotos ?? [],
      status_atualizacao: current?.status_atualizacao || "pendente",
    };
  });

  // 1) Atualiza os dados-base. O que já foi coletado em campo é preservado.
  for (let i = 0; i < clientRows.length; i += BATCH) {
    const { error } = await supabase
      .from("clientes_cadastro")
      .upsert(clientRows.slice(i, i + BATCH), { onConflict: "codcli" });
    if (error) throw error;
  }

  // 2) Sincroniza a carteira. Primeiro grava os vínculos atuais; só depois remove os antigos.
  const links = normalizedRows.map((row) => ({
    codcli: row.codcli,
    cod_rca: row.cod_rca,
    nome_rca: row.nome_rca,
  }));
  for (let i = 0; i < clientCodes.length; i += BATCH) {
    const codes = clientCodes.slice(i, i + BATCH);
    const codesInBatch = new Set(codes);
    const batchLinks = links.filter((link) => codesInBatch.has(link.codcli));
    const { error: upsertError } = await supabase
      .from("clientes_cadastro_rcas")
      .upsert(batchLinks, { onConflict: "codcli,cod_rca" });
    if (upsertError) throw upsertError;

    const { data: storedLinks, error: listError } = await supabase
      .from("clientes_cadastro_rcas")
      .select("id,codcli,cod_rca")
      .in("codcli", codes);
    if (listError) throw listError;

    const desired = new Set(batchLinks.map((link) => `${link.codcli}|${link.cod_rca}`));
    const staleIds = (storedLinks || [])
      .filter((link) => !desired.has(`${link.codcli}|${link.cod_rca}`))
      .map((link) => link.id);
    for (let staleIndex = 0; staleIndex < staleIds.length; staleIndex += BATCH) {
      const { error: deleteError } = await supabase
        .from("clientes_cadastro_rcas")
        .delete()
        .in("id", staleIds.slice(staleIndex, staleIndex + BATCH));
      if (deleteError) throw deleteError;
    }
  }

  // 3) Atualiza nomes dos vendedores já cadastrados na gestão de equipes.
  const vendors = new Map<string, string>();
  normalizedRows.forEach((row) => {
    if (row.nome_rca) vendors.set(row.cod_rca, row.nome_rca);
  });
  const vendorEntries = [...vendors.entries()];
  for (let i = 0; i < vendorEntries.length; i += 10) {
    await Promise.all(
      vendorEntries.slice(i, i + 10).map(async ([code, name]) => {
        const { error } = await supabase
          .from("teams_vendors")
          .update({ nome_rca: name })
          .eq("cod_rca_lopes", code)
          .eq("cargo", "vendedor");
        if (error) throw error;
      })
    );
  }

  return {
    clients: clientRows.length,
    links: links.length,
    vendorsUpdated: vendorEntries.length,
  };
};
