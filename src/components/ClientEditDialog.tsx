import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";
import { maskPhoneBR, isValidEmail } from "@/lib/exportClientUpdatesXLSX";
import { RAMOS_ATIVIDADE } from "@/lib/ramosAtividade";
import { ImageUploader } from "@/components/ImageUploader";

export interface ClientRow {
  codcli: number;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  cod_rca: string | null;
  nome_rca: string | null;
  ramo_atividade: string | null;
  qtd_checkouts: number | null;
  telefone: string | null;
  email: string | null;
  status_atualizacao: string;
  fotos?: string[] | null;
}

interface Props {
  client: ClientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ClientEditDialog({ client, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [ramo, setRamo] = useState("");
  const [fantasia, setFantasia] = useState("");
  const [checkouts, setCheckouts] = useState<string>("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setRamo(client.ramo_atividade || "");
      setFantasia(client.nome_fantasia || "");
      setCheckouts(
        client.qtd_checkouts !== null && client.qtd_checkouts !== undefined
          ? String(client.qtd_checkouts)
          : ""
      );
      setTelefone(maskPhoneBR(client.telefone || ""));
      setEmail(client.email || "");
      setFotos(client.fotos || []);
    }
  }, [client]);

  const handleSave = async () => {
    if (!client) return;
    if (!ramo.trim()) return toast.error("Ramo de Atividade é obrigatório");
    if (!fantasia.trim()) return toast.error("Nome Fantasia é obrigatório");
    const checkoutsNum = checkouts.trim() === "" ? null : parseInt(checkouts, 10);
    if (checkouts.trim() !== "" && (isNaN(checkoutsNum!) || checkoutsNum! < 0)) {
      return toast.error("Quantidade de checkouts inválida");
    }
    if (!telefone.trim()) return toast.error("Telefone é obrigatório");
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Telefone inválido");
    if (!email.trim()) return toast.error("E-mail é obrigatório");
    if (!isValidEmail(email)) return toast.error("E-mail inválido");

    setSaving(true);
    try {
      const userName =
        (user?.user_metadata?.full_name as string | undefined) ||
        user?.email?.split("@")[0] ||
        "";

      const nowIso = new Date().toISOString();

      // 1) histórico
      const { error: histErr } = await supabase
        .from("clientes_cadastro_historico")
        .insert({
          cliente_codcli: client.codcli,
          cod_rca: client.cod_rca,
          nome_rca: client.nome_rca,
          razao_social: client.razao_social,
          ramo_anterior: client.ramo_atividade,
          ramo_novo: ramo.trim(),
          fantasia_anterior: client.nome_fantasia,
          fantasia_novo: fantasia.trim(),
          checkouts_anterior: client.qtd_checkouts,
          checkouts_novo: checkoutsNum,
          telefone_anterior: client.telefone,
          telefone_novo: telefone.trim(),
          email_anterior: client.email,
          email_novo: email.trim(),
          fotos_anterior: client.fotos || [],
          fotos_novo: fotos,
          alterado_em: nowIso,
          alterado_por: user?.id,
          alterado_por_nome: userName,
          alterado_por_email: user?.email,
        });
      if (histErr) throw histErr;

      // 2) mestre
      const { error: updErr } = await supabase
        .from("clientes_cadastro")
        .update({
          ramo_atividade: ramo.trim(),
          nome_fantasia: fantasia.trim(),
          qtd_checkouts: checkoutsNum,
          telefone: telefone.trim(),
          email: email.trim(),
          fotos: fotos,
          status_atualizacao: "atualizado",
          atualizado_em: nowIso,
          atualizado_por: user?.id,
          atualizado_por_nome: userName,
        })
        .eq("codcli", client.codcli);
      if (updErr) throw updErr;

      toast.success("Cliente atualizado com sucesso!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Atualize Ramo de Atividade, Telefone e E-mail. Os demais campos são somente leitura.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <ReadOnlyField label="Código" value={String(client.codcli)} />
          <ReadOnlyField label="CNPJ" value={client.cnpj || "-"} />
          <div className="md:col-span-2">
            <ReadOnlyField label="Razão Social" value={client.razao_social} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="ramo">Ramo de Atividade *</Label>
            <Select value={ramo} onValueChange={setRamo}>
              <SelectTrigger id="ramo">
                <SelectValue placeholder="Selecione o ramo de atividade" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {RAMOS_ATIVIDADE.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="fantasia">Nome Fantasia *</Label>
            <Input
              id="fantasia"
              value={fantasia}
              onChange={(e) => setFantasia(e.target.value)}
              placeholder="Nome fantasia do cliente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkouts">Qtd. de Checkouts</Label>
            <Input
              id="checkouts"
              type="number"
              min={0}
              value={checkouts}
              onChange={(e) => setCheckouts(e.target.value)}
              placeholder="Ex.: 5"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tel">Telefone *</Label>
            <Input
              id="tel"
              value={telefone}
              onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
              placeholder="(92) 99999-9999"
              inputMode="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mail">E-mail *</Label>
            <Input
              id="mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Fotos da fachada interna (até 2)</Label>
            <ImageUploader value={fotos} onChange={setFotos} maxImages={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm min-h-[40px] flex items-center">
        {value}
      </div>
    </div>
  );
}