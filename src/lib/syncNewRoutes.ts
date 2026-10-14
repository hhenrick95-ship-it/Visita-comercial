import { supabase } from "@/integrations/supabase/client";

interface ExistingMember {
  cod_equipe: string;
  nome_equipe: string;
  nome_rca: string | null;
  cod_rca_lopes: string;
  cargo: string | null;
  supervisor_id: string | null;
}

export interface NewRouteRecord {
  cod_equipe: string;
  nome_equipe: string;
  nome_rca: string;
  cod_rca_lopes: string;
  cargo: "vendedor";
  supervisor_id: string | null;
  /** Rota vizinha usada como modelo (ex: "J15 - DIEGO OLIVEIRA LIMA") */
  baseadoEm: string;
}

export interface NewRoutesPlan {
  toCreate: NewRouteRecord[];
  /** Rotas da base de clientes sem rota vizinha para copiar equipe/supervisor */
  skipped: { cod_rca: string; nome_rca: string }[];
}

const PAGE_SIZE = 1000;

/** Lê todos os pares (cod_rca, nome_rca) de uma tabela de clientes, paginando. */
const fetchRcasFrom = async (table: "clientes_cadastro" | "clientes_cadastro_rcas") => {
  const result = new Map<string, string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("cod_rca, nome_rca")
      .not("cod_rca", "is", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data || []) {
      const cod = (row.cod_rca || "").trim();
      if (cod && !result.has(cod)) result.set(cod, (row.nome_rca || "").trim());
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return result;
};

/**
 * Monta o nome no padrão das rotas vizinhas. Ex: vizinha "J15 - DIEGO" (3915)
 * e nova rota 3916 "FULANO" => "J16 - FULANO".
 */
const buildRouteName = (cod: number, sourceName: string, neighbor: ExistingMember): string => {
  if (/^[A-Z]+\d+\s*-/i.test(sourceName)) return sourceName;
  const match = (neighbor.nome_rca || "").match(/^([A-Z]+)(\d+)\s*-/i);
  const neighborCod = Number(neighbor.cod_rca_lopes);
  if (match && Number(match[2]) === neighborCod % 100) {
    const prefix = `${match[1].toUpperCase()}${String(cod % 100).padStart(match[2].length, "0")}`;
    return sourceName ? `${prefix} - ${sourceName}` : prefix;
  }
  return sourceName || String(cod);
};

/**
 * Encontra rotas (RCAs) que existem na base de clientes mas ainda não estão
 * cadastradas em Gestão de Equipes. Cada rota nova copia equipe e supervisor
 * da rota vendedora mais próxima pelo código (ex: 3916 usa a 3915).
 */
export const planNewRoutes = async (existing: ExistingMember[]): Promise<NewRoutesPlan> => {
  const [direct, linked] = await Promise.all([
    fetchRcasFrom("clientes_cadastro"),
    fetchRcasFrom("clientes_cadastro_rcas"),
  ]);
  const sourceRcas = new Map(linked);
  for (const [cod, nome] of direct) {
    if (nome || !sourceRcas.get(cod)) sourceRcas.set(cod, nome);
  }

  const existingCodes = new Set(existing.map((m) => m.cod_rca_lopes.trim()));
  const vendors = existing.filter((m) => m.cargo === "vendedor" && /^\d+$/.test(m.cod_rca_lopes.trim()));

  const toCreate: NewRouteRecord[] = [];
  const skipped: NewRoutesPlan["skipped"] = [];

  for (const [codStr, nome] of [...sourceRcas].sort(([a], [b]) => a.localeCompare(b))) {
    if (existingCodes.has(codStr)) continue;
    if (!/^\d+$/.test(codStr)) {
      skipped.push({ cod_rca: codStr, nome_rca: nome });
      continue;
    }
    const cod = Number(codStr);
    // Vizinha: mesmo bloco de centena (ex: 39xx) e código mais próximo
    let neighbor: ExistingMember | null = null;
    let bestDiff = Infinity;
    for (const v of vendors) {
      const vCod = Number(v.cod_rca_lopes);
      if (Math.floor(vCod / 100) !== Math.floor(cod / 100)) continue;
      const diff = Math.abs(vCod - cod);
      if (diff < bestDiff) {
        bestDiff = diff;
        neighbor = v;
      }
    }
    if (!neighbor) {
      skipped.push({ cod_rca: codStr, nome_rca: nome });
      continue;
    }
    toCreate.push({
      cod_equipe: neighbor.cod_equipe,
      nome_equipe: neighbor.nome_equipe,
      nome_rca: buildRouteName(cod, nome, neighbor),
      cod_rca_lopes: codStr,
      cargo: "vendedor",
      supervisor_id: neighbor.supervisor_id,
      baseadoEm: neighbor.nome_rca || neighbor.cod_rca_lopes,
    });
  }

  return { toCreate, skipped };
};

export const createNewRoutes = async (records: NewRouteRecord[]) => {
  const rows = records.map(({ baseadoEm, ...r }) => r);
  const { error } = await supabase.from("teams_vendors").insert(rows);
  if (error) throw error;
};
