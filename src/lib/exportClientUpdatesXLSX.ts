import * as XLSX from "@e965/xlsx";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

const PHOTO_BUCKET = "form-images";

type HistoryRow = {
  cliente_codcli: number;
  cod_rca: string | null;
  nome_rca: string | null;
  razao_social: string | null;
  fantasia_anterior: string | null;
  fantasia_novo: string | null;
  ramo_anterior: string | null;
  ramo_novo: string | null;
  checkouts_anterior: number | null;
  checkouts_novo: number | null;
  telefone_anterior: string | null;
  telefone_novo: string | null;
  email_anterior: string | null;
  email_novo: string | null;
  fotos_novo: string[] | null;
  alterado_em: string | null;
  alterado_por_nome: string | null;
  alterado_por_email: string | null;
};

export type ClientUpdatesExportResult = {
  records: number;
  photos: number;
  failedPhotos: number;
};

function extractStoragePath(value: string): string {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/form-images\/(.+)$/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Valores novos já são gravados como caminho relativo no bucket.
  }
  return value.replace(/^\/+/, "").split("?")[0];
}

function safeFileName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportClientUpdatesXLSX(
  codRcaFilter?: string | null
): Promise<ClientUpdatesExportResult> {
  let query = supabase
    .from("clientes_cadastro_historico")
    .select("*")
    .order("alterado_em", { ascending: false });

  if (codRcaFilter) query = query.eq("cod_rca", codRcaFilter);

  const { data, error } = await query;
  if (error) throw error;

  const history = (data || []) as HistoryRow[];
  const photoArchivePaths = new Map<string, string>();

  for (const item of history) {
    const photos = item.fotos_novo || [];
    photos.forEach((storedValue, index) => {
      const storagePath = extractStoragePath(storedValue);
      const originalName = safeFileName(storagePath.split("/").pop() || `foto-${index + 1}.jpg`);
      const archivePath = `Fotos/Cliente-${item.cliente_codcli}/${String(index + 1).padStart(2, "0")}-${originalName}`;
      photoArchivePaths.set(`${item.cliente_codcli}|${storagePath}`, archivePath);
    });
  }

  const rows = history.map((item) => {
    const dt = item.alterado_em ? new Date(item.alterado_em) : null;
    const photos = item.fotos_novo || [];
    const photoPaths = photos.map((storedValue) => {
      const storagePath = extractStoragePath(storedValue);
      return photoArchivePaths.get(`${item.cliente_codcli}|${storagePath}`) || "";
    });

    return {
      RCA: item.nome_rca || item.cod_rca || "",
      "Código do Cliente": item.cliente_codcli,
      "Razão Social": item.razao_social || "",
      "Fantasia Anterior": item.fantasia_anterior || "",
      "Novo Fantasia": item.fantasia_novo || "",
      "Ramo Anterior": item.ramo_anterior || "",
      "Novo Ramo": item.ramo_novo || "",
      "Checkouts Anterior": item.checkouts_anterior ?? "",
      "Novo Checkouts": item.checkouts_novo ?? "",
      "Telefone Anterior": item.telefone_anterior || "",
      "Novo Telefone": item.telefone_novo || "",
      "E-mail Anterior": item.email_anterior || "",
      "Novo E-mail": item.email_novo || "",
      "Foto 1": photoPaths[0] || "",
      "Foto 2": photoPaths[1] || "",
      Data: dt ? dt.toLocaleDateString("pt-BR") : "",
      Hora: dt ? dt.toLocaleTimeString("pt-BR") : "",
      Usuário: item.alterado_por_nome || item.alterado_por_email || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 34 }, { wch: 26 }, { wch: 26 },
    { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 20 },
    { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 55 }, { wch: 55 },
    { wch: 12 }, { wch: 12 }, { wch: 28 },
  ];

  // Os caminhos relativos continuam funcionando após extrair o ZIP.
  rows.forEach((row, rowIndex) => {
    ["Foto 1", "Foto 2"].forEach((columnName, photoIndex) => {
      const target = row[columnName as "Foto 1" | "Foto 2"];
      if (!target) return;
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 13 + photoIndex });
      if (ws[cellAddress]) ws[cellAddress].l = { Target: target };
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Atualizações");

  const stamp = new Date().toISOString().slice(0, 10);
  const workbookName = `atualizacoes-cadastrais-${stamp}.xlsx`;
  const workbookData = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  const zip = new JSZip();
  zip.file(workbookName, workbookData);
  zip.file(
    "LEIA-ME.txt",
    "A planilha contém o histórico das atualizações cadastrais.\r\n" +
      "As colunas Foto 1 e Foto 2 apontam para as imagens da pasta Fotos.\r\n" +
      "Extraia todo o conteúdo do ZIP antes de abrir os links das fotos.\r\n"
  );

  const uniquePhotos = new Map<string, { storagePath: string; archivePath: string }>();
  for (const item of history) {
    for (const storedValue of item.fotos_novo || []) {
      const storagePath = extractStoragePath(storedValue);
      const key = `${item.cliente_codcli}|${storagePath}`;
      const archivePath = photoArchivePaths.get(key);
      if (archivePath) uniquePhotos.set(key, { storagePath, archivePath });
    }
  }

  let photos = 0;
  let failedPhotos = 0;
  const pendingPhotos = Array.from(uniquePhotos.values());

  // Limita downloads simultâneos para funcionar melhor em celulares.
  for (let index = 0; index < pendingPhotos.length; index += 4) {
    const batch = pendingPhotos.slice(index, index + 4);
    const results = await Promise.all(
      batch.map(async ({ storagePath, archivePath }) => {
        const { data: photo, error: photoError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .download(storagePath);
        if (photoError || !photo) return false;
        zip.file(archivePath, photo);
        return true;
      })
    );
    photos += results.filter(Boolean).length;
    failedPhotos += results.filter((success) => !success).length;
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  saveBlob(zipBlob, `atualizacoes-cadastrais-com-fotos-${stamp}.zip`);

  return { records: history.length, photos, failedPhotos };
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
