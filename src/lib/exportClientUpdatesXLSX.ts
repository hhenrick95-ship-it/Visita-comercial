import * as XLSX from "@e965/xlsx";
import { supabase } from "@/integrations/supabase/client";

export async function exportClientUpdatesXLSX(codRcaFilter?: string | null) {
  let query = supabase
    .from("clientes_cadastro_historico")
    .select("*")
    .order("alterado_em", { ascending: false });

  if (codRcaFilter) query = query.eq("cod_rca", codRcaFilter);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((h: any) => {
    const dt = h.alterado_em ? new Date(h.alterado_em) : null;
    return {
      RCA: h.nome_rca || h.cod_rca || "",
      "Código do Cliente": h.cliente_codcli,
      "Razão Social": h.razao_social || "",
      "Fantasia Anterior": h.fantasia_anterior || "",
      "Novo Fantasia": h.fantasia_novo || "",
      "Ramo Anterior": h.ramo_anterior || "",
      "Novo Ramo": h.ramo_novo || "",
      "Checkouts Anterior": h.checkouts_anterior ?? "",
      "Novo Checkouts": h.checkouts_novo ?? "",
      "Telefone Anterior": h.telefone_anterior || "",
      "Novo Telefone": h.telefone_novo || "",
      "E-mail Anterior": h.email_anterior || "",
      "Novo E-mail": h.email_novo || "",
      Data: dt ? dt.toLocaleDateString("pt-BR") : "",
      Hora: dt ? dt.toLocaleTimeString("pt-BR") : "",
      Usuário: h.alterado_por_nome || h.alterado_por_email || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Atualizações");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `atualizacoes-cadastrais-${stamp}.xlsx`);
}

export function maskPhoneBR(input: string): string {
  const digits = (input || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{0,2})/, "($1")
      .replace(/^\((\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{0,2})/, "($1")
    .replace(/^\((\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}