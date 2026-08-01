import * as XLSX from "@e965/xlsx";
import { supabase } from "@/integrations/supabase/client";

type TeamRole = "coordenador" | "gerente" | "supervisor" | "vendedor";

interface TeamVendor {
  id: string;
  cod_equipe: string;
  nome_equipe: string;
  nome_rca: string | null;
  cod_rca_lopes: string;
  cargo: TeamRole;
  supervisor_id: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  duplicates: Array<{
    cod_rca_lopes: string;
    rows: number[];
  }>;
  totalRows: number;
  validRows: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
  createdIds: string[];
  updatedRecords: Array<{
    id: string;
    previousData: Partial<TeamVendor>;
  }>;
}

export interface ImportHistoryRecord {
  id: string;
  created_at: string;
  total_created: number;
  total_updated: number;
  status: "completed" | "rolled_back";
  rolled_back_at: string | null;
}

const HEADERS_PT = ["ID (automático)", "Cód. Equipe", "Nome Equipe", "Nome RCA", "Cód. RCA Lopes", "Cargo", "ID Supervisor"];

export function exportTeamsToXLSX(teams: TeamVendor[]): void {
  // Prepare data with Portuguese headers
  const data = teams.map((team) => ({
    "ID (automático)": team.id,
    "Cód. Equipe": team.cod_equipe,
    "Nome Equipe": team.nome_equipe,
    "Nome RCA": team.nome_rca || "",
    "Cód. RCA Lopes": team.cod_rca_lopes,
    "Cargo": team.cargo,
    "ID Supervisor": team.supervisor_id || "",
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Equipes");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 38 }, // ID
    { wch: 12 }, // Cód. Equipe
    { wch: 30 }, // Nome Equipe
    { wch: 30 }, // Nome RCA
    { wch: 15 }, // Cód. RCA Lopes
    { wch: 12 }, // Cargo
    { wch: 38 }, // ID Supervisor
  ];

  // Generate filename with date
  const date = new Date().toISOString().split("T")[0];
  const filename = `equipes_${date}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
}

function parseXLSXRow(row: Record<string, any>, rowNum: number): { record: any; id?: string; error?: string } | null {
  // Map Portuguese headers to internal keys
  const id = (row["ID (automático)"] || row["ID (não alterar)"] || row["id"] || "").toString().trim();
  const cod_equipe = (row["Cód. Equipe"] || row["cod_equipe"] || "").toString().trim();
  const nome_equipe = (row["Nome Equipe"] || row["nome_equipe"] || "").toString().trim();
  const nome_rca = (row["Nome RCA"] || row["nome_rca"] || "").toString().trim() || null;
  const cod_rca_lopes = (row["Cód. RCA Lopes"] || row["cod_rca_lopes"] || "").toString().trim();
  const cargoRaw = (row["Cargo"] || row["cargo"] || "vendedor").toString().trim().toLowerCase();
  const supervisor_id = (row["ID Supervisor"] || row["supervisor_id"] || "").toString().trim() || null;

  // Validate required fields
  if (!cod_equipe) {
    return { record: null, error: `Linha ${rowNum}: Cód. Equipe é obrigatório` };
  }
  if (!nome_equipe) {
    return { record: null, error: `Linha ${rowNum}: Nome Equipe é obrigatório` };
  }
  if (!cod_rca_lopes) {
    return { record: null, error: `Linha ${rowNum}: Cód. RCA Lopes é obrigatório` };
  }

  // Validate cargo
  let cargo: TeamRole = "vendedor";
  if (cargoRaw === "coordenador" || cargoRaw === "gerente" || cargoRaw === "supervisor" || cargoRaw === "vendedor") {
    cargo = cargoRaw as TeamRole;
  }

  const record = {
    cod_equipe,
    nome_equipe,
    nome_rca,
    cod_rca_lopes,
    cargo,
    supervisor_id: cargo === "vendedor" ? supervisor_id : null,
  };

  return { record, id: id || undefined };
}

export async function validateXLSXFile(file: File): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Track cod_rca_lopes occurrences
        const codeOccurrences = new Map<string, number[]>();
        let validRows = 0;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as Record<string, any>;
          const rowNum = i + 2; // Excel row (1-indexed + header)
          
          const cod_rca_lopes = (row["Cód. RCA Lopes"] || row["cod_rca_lopes"] || "").toString().trim();
          
          if (cod_rca_lopes) {
            const existing = codeOccurrences.get(cod_rca_lopes) || [];
            existing.push(rowNum);
            codeOccurrences.set(cod_rca_lopes, existing);
            validRows++;
          }
        }

        // Find duplicates
        const duplicates: Array<{ cod_rca_lopes: string; rows: number[] }> = [];
        codeOccurrences.forEach((rows, code) => {
          if (rows.length > 1) {
            duplicates.push({ cod_rca_lopes: code, rows });
          }
        });

        resolve({
          isValid: duplicates.length === 0,
          duplicates,
          totalRows: jsonData.length,
          validRows,
        });
      } catch (error: any) {
        reject(new Error(`Erro ao validar arquivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function importTeamsFromXLSX(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let created = 0;
        let updated = 0;
        const errors: string[] = [];
        const createdIds: string[] = [];
        const updatedRecords: Array<{ id: string; previousData: Partial<TeamVendor> }> = [];

        // Prepare all records for processing
        const recordsToProcess: Array<{
          rowNum: number;
          id?: string;
          record: any;
        }> = [];

        // Parse and validate all rows first
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as Record<string, any>;
          const rowNum = i + 2; // Excel row (1-indexed + header)

          const parsed = parseXLSXRow(row, rowNum);
          if (!parsed || parsed.error) {
            if (parsed?.error) errors.push(parsed.error);
            continue;
          }

          recordsToProcess.push({ 
            rowNum, 
            id: parsed.id, 
            record: parsed.record 
          });
        }

        // Process in parallel batches
        const BATCH_SIZE = 10;
        const totalBatches = Math.ceil(recordsToProcess.length / BATCH_SIZE);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const start = batchIndex * BATCH_SIZE;
          const batch = recordsToProcess.slice(start, start + BATCH_SIZE);

          // Process batch in parallel
          const results = await Promise.allSettled(
            batch.map(async ({ rowNum, id, record }) => {
              if (id) {
                // Fetch previous data before update
                const { data: existingData } = await supabase
                  .from("teams_vendors")
                  .select("*")
                  .eq("id", id)
                  .single();

                // Update existing record by ID
                const { error } = await supabase
                  .from("teams_vendors")
                  .update(record)
                  .eq("id", id);

                if (error) throw { rowNum, message: error.message, isUpdate: true };
                
                return { 
                  isUpdate: true, 
                  id,
                  previousData: existingData 
                };
              } else {
                // Check if exists by cod_rca_lopes
                const { data: existing } = await supabase
                  .from("teams_vendors")
                  .select("*")
                  .eq("cod_rca_lopes", record.cod_rca_lopes)
                  .maybeSingle();

                if (existing) {
                  // Update existing
                  const { error } = await supabase
                    .from("teams_vendors")
                    .update(record)
                    .eq("id", existing.id);

                  if (error) throw { rowNum, message: error.message, isUpdate: true };
                  
                  return { 
                    isUpdate: true, 
                    id: existing.id,
                    previousData: existing 
                  };
                } else {
                  // Insert new
                  const { data: inserted, error } = await supabase
                    .from("teams_vendors")
                    .insert(record)
                    .select("id")
                    .single();

                  if (error) throw { rowNum, message: error.message, isUpdate: false };
                  
                  return { 
                    isUpdate: false, 
                    id: inserted?.id 
                  };
                }
              }
            })
          );

          // Process results
          for (const result of results) {
            if (result.status === "fulfilled") {
              if (result.value.isUpdate) {
                updated++;
                if (result.value.id && result.value.previousData) {
                  updatedRecords.push({
                    id: result.value.id,
                    previousData: result.value.previousData,
                  });
                }
              } else {
                created++;
                if (result.value.id) {
                  createdIds.push(result.value.id);
                }
              }
            } else {
              const err = result.reason;
              errors.push(`Linha ${err.rowNum}: Erro ao ${err.isUpdate ? "atualizar" : "criar"} - ${err.message}`);
            }
          }

          // Report progress
          if (onProgress) {
            const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
            onProgress(progress);
          }
        }

        resolve({ created, updated, errors, createdIds, updatedRecords });
      } catch (error: any) {
        reject(new Error(`Erro ao processar arquivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function rollbackImport(
  createdIds: string[],
  updatedRecords: Array<{ id: string; previousData: Partial<TeamVendor> }>,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; deletedCount: number; restoredCount: number; errors: string[] }> {
  const errors: string[] = [];
  let deletedCount = 0;
  let restoredCount = 0;

  const totalOperations = createdIds.length + updatedRecords.length;
  let completedOperations = 0;

  // Delete created records in batches
  const DELETE_BATCH_SIZE = 10;
  for (let i = 0; i < createdIds.length; i += DELETE_BATCH_SIZE) {
    const batch = createdIds.slice(i, i + DELETE_BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const { error } = await supabase
          .from("teams_vendors")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
        return true;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        deletedCount++;
      } else {
        errors.push(`Erro ao excluir registro: ${result.reason?.message || "Erro desconhecido"}`);
      }
      completedOperations++;
    }

    if (onProgress) {
      onProgress(Math.round((completedOperations / totalOperations) * 100));
    }
  }

  // Restore updated records in batches
  const UPDATE_BATCH_SIZE = 10;
  for (let i = 0; i < updatedRecords.length; i += UPDATE_BATCH_SIZE) {
    const batch = updatedRecords.slice(i, i + UPDATE_BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async ({ id, previousData }) => {
        const { error } = await supabase
          .from("teams_vendors")
          .update({
            cod_equipe: previousData.cod_equipe,
            nome_equipe: previousData.nome_equipe,
            nome_rca: previousData.nome_rca,
            cod_rca_lopes: previousData.cod_rca_lopes,
            cargo: previousData.cargo,
            supervisor_id: previousData.supervisor_id,
          })
          .eq("id", id);
        
        if (error) throw error;
        return true;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        restoredCount++;
      } else {
        errors.push(`Erro ao restaurar registro: ${result.reason?.message || "Erro desconhecido"}`);
      }
      completedOperations++;
    }

    if (onProgress) {
      onProgress(Math.round((completedOperations / totalOperations) * 100));
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    restoredCount,
    errors,
  };
}

// Save import to history database
export async function saveImportToHistory(result: ImportResult): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("import_history")
      .insert({
        total_created: result.created,
        total_updated: result.updated,
        created_ids: result.createdIds,
        updated_records: result.updatedRecords,
        status: "completed",
      })
      .select("id")
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error: any) {
    console.error("Erro ao salvar histórico de importação:", error);
    return null;
  }
}

// Fetch import history
export async function fetchImportHistory(): Promise<ImportHistoryRecord[]> {
  try {
    const { data, error } = await supabase
      .from("import_history")
      .select("id, created_at, total_created, total_updated, status, rolled_back_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []) as ImportHistoryRecord[];
  } catch (error: any) {
    console.error("Erro ao buscar histórico:", error);
    return [];
  }
}

// Get import details for rollback
export async function getImportDetails(importId: string): Promise<{
  createdIds: string[];
  updatedRecords: Array<{ id: string; previousData: Partial<TeamVendor> }>;
} | null> {
  try {
    const { data, error } = await supabase
      .from("import_history")
      .select("created_ids, updated_records")
      .eq("id", importId)
      .single();

    if (error) throw error;
    
    return {
      createdIds: (data?.created_ids as string[]) || [],
      updatedRecords: (data?.updated_records as Array<{ id: string; previousData: Partial<TeamVendor> }>) || [],
    };
  } catch (error: any) {
    console.error("Erro ao buscar detalhes da importação:", error);
    return null;
  }
}

// Mark import as rolled back
export async function markImportAsRolledBack(importId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("import_history")
      .update({
        status: "rolled_back",
        rolled_back_at: new Date().toISOString(),
      })
      .eq("id", importId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Erro ao marcar importação como desfeita:", error);
    return false;
  }
}
