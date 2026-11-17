import { useState } from "react";
import { Loader2, MapPinned, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface EligibleLocationSubmission {
  id: string;
  clientCode: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface CorrectionRecord {
  submission_id: string;
  client_code: number;
  client_name: string;
  expected_old_latitude: number | null;
  expected_old_longitude: number | null;
  expected_old_address: string;
  new_latitude: number;
  new_longitude: number;
  new_address: string;
}

interface CorrectionFile {
  format: string;
  template: string;
  responsible: string;
  source: string;
  generated_at: string;
  records: CorrectionRecord[];
}

interface Props {
  templateId: string;
  eligibleSubmissions: EligibleLocationSubmission[];
  onCompleted?: () => void | Promise<void>;
}

const sameNumber = (left: unknown, right: unknown) => {
  if ((left === null || left === undefined || left === "") && (right === null || right === undefined || right === "")) return true;
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.0000001;
};

const validCoordinate = (latitude: unknown, longitude: unknown) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && !(lat === 0 && lon === 0);
};

export function HistoricalLocationCorrection({ templateId, eligibleSubmissions, onCompleted }: Props) {
  const { role } = useAuth();
  const [correction, setCorrection] = useState<CorrectionFile | null>(null);
  const [validationError, setValidationError] = useState("");
  const [applying, setApplying] = useState(false);

  if (role !== "admin") return null;

  const loadFile = async (file: File | undefined) => {
    setCorrection(null);
    setValidationError("");
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as CorrectionFile;
      if (parsed.format !== "lopes-location-correction-v1") throw new Error("Formato de arquivo de correção inválido.");
      if (parsed.template !== "PEX - Visita Gerente" || parsed.responsible !== "Alexandre Frasson") {
        throw new Error("O arquivo não pertence ao PEX - Visita Gerente de Alexandre Frasson.");
      }
      if (!Array.isArray(parsed.records) || !parsed.records.length) throw new Error("O arquivo não contém correções.");

      const eligible = new Map(eligibleSubmissions.map(item => [item.id, item]));
      const seen = new Set<string>();
      for (const record of parsed.records) {
        if (seen.has(record.submission_id)) throw new Error(`Envio duplicado no arquivo: ${record.submission_id}`);
        seen.add(record.submission_id);
        const current = eligible.get(record.submission_id);
        if (!current) throw new Error(`O envio ${record.submission_id} não está entre os registros válidos do Alexandre.`);
        if (current.clientCode !== String(record.client_code)) throw new Error(`Código do cliente divergente no envio ${record.submission_id}.`);
        const stillOriginal = sameNumber(current.latitude, record.expected_old_latitude) && sameNumber(current.longitude, record.expected_old_longitude);
        const alreadyCorrected = sameNumber(current.latitude, record.new_latitude) && sameNumber(current.longitude, record.new_longitude);
        if (!stillOriginal && !alreadyCorrected) throw new Error(`A localização do envio ${record.submission_id} mudou após a geração do arquivo.`);
        if (!validCoordinate(record.new_latitude, record.new_longitude)) throw new Error(`Coordenadas inválidas no envio ${record.submission_id}.`);
      }
      setCorrection(parsed);
    } catch (error: any) {
      setValidationError(error.message || "Não foi possível validar o arquivo.");
    }
  };

  const applyCorrection = async () => {
    if (!correction || applying) return;
    const confirmed = window.confirm(
      `Corrigir a localização de ${correction.records.length} pesquisas históricas do Alexandre Frasson? Os valores anteriores serão preservados nos metadados para auditoria.`,
    );
    if (!confirmed) return;

    setApplying(true);
    try {
      const ids = correction.records.map(record => record.submission_id);
      const { data, error } = await supabase
        .from("form_submissions")
        .select("id, template_id, latitude, longitude, address, geolocation_status, geolocation_error, metadata")
        .in("id", ids);
      if (error) throw error;
      if ((data || []).length !== ids.length) throw new Error("Nem todos os envios foram encontrados ou estão acessíveis.");

      const currentById = new Map((data || []).map((item: any) => [item.id, item]));
      let corrected = 0;
      let alreadyCorrected = 0;

      for (const record of correction.records) {
        const current: any = currentById.get(record.submission_id);
        if (!current || current.template_id !== templateId) throw new Error(`Template divergente no envio ${record.submission_id}.`);
        if (sameNumber(current.latitude, record.new_latitude) && sameNumber(current.longitude, record.new_longitude)) {
          alreadyCorrected += 1;
          continue;
        }
        if (!sameNumber(current.latitude, record.expected_old_latitude) || !sameNumber(current.longitude, record.expected_old_longitude)) {
          throw new Error(`A localização original do envio ${record.submission_id} não confere. Nenhuma alteração adicional foi feita nele.`);
        }

        const metadata = current.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
          ? current.metadata
          : {};
        const history = Array.isArray(metadata.location_correction_history)
          ? metadata.location_correction_history
          : [];
        const auditEntry = {
          corrected_at: new Date().toISOString(),
          reason: "Preenchimento histórico realizado fora do cliente; coordenada substituída pela localização oficial do cadastro.",
          responsible: correction.responsible,
          source: correction.source,
          client_code: record.client_code,
          client_name: record.client_name,
          previous: {
            latitude: current.latitude,
            longitude: current.longitude,
            address: current.address,
            geolocation_status: current.geolocation_status,
            geolocation_error: current.geolocation_error,
          },
        };

        const { error: updateError } = await supabase
          .from("form_submissions")
          .update({
            latitude: record.new_latitude,
            longitude: record.new_longitude,
            address: record.new_address || current.address,
            geolocation_status: "corrected_client_master",
            geolocation_error: null,
            metadata: { ...metadata, location_correction_history: [...history, auditEntry] },
          })
          .eq("id", record.submission_id)
          .eq("template_id", templateId);
        if (updateError) throw new Error(`Falha no envio ${record.submission_id}: ${updateError.message}`);
        corrected += 1;
      }

      toast.success(`${corrected} localização(ões) corrigida(s). ${alreadyCorrected ? `${alreadyCorrected} já estava(m) correta(s).` : ""}`);
      await onCompleted?.();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível concluir a correção.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><MapPinned className="h-5 w-5" />Correção histórica de localização — Alexandre Frasson</CardTitle>
        <CardDescription>
          Ferramenta restrita a administradores. Corrige somente os envios listados no arquivo validado e preserva a localização anterior para auditoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50">
          <Upload className="h-4 w-4" />Selecionar arquivo de correção
          <input type="file" accept="application/json,.json" className="sr-only" onChange={event => loadFile(event.target.files?.[0])} />
        </label>
        {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        {correction && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3">
            <div className="text-sm">
              <p className="font-semibold">Arquivo validado: {correction.records.length} envios</p>
              <p className="text-muted-foreground">Fonte: view_rca_cliente · somente Alexandre Frasson</p>
            </div>
            <Button type="button" onClick={applyCorrection} disabled={applying} className="min-h-11">
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPinned className="mr-2 h-4 w-4" />}
              Aplicar correções
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
