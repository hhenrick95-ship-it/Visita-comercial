import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import logoLopes from "@/assets/logo-lopes.png";

type Option = { value: string; label: string };

const PRAZO: Option[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];
const CONDICAO: Option[] = [
  { value: "sim_todos", label: "Sim, todos" },
  { value: "parcialmente", label: "Parcialmente" },
  { value: "nao", label: "Não" },
];
const PEDIDO: Option[] = [
  { value: "totalmente_correto", label: "Sim, totalmente correto" },
  { value: "pequenas_divergencias", label: "Houve pequenas divergências" },
  { value: "divergencias_relevantes", label: "Houve divergências relevantes" },
];
const LABELS_ATENDIMENTO = ["Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];
const LABELS_SATISFACAO = ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"];

const Question = ({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div>
      <p className="font-medium leading-snug">
        {n}. {title}
        {n <= 5 && <span className="text-destructive ml-1">*</span>}
      </p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
    </div>
    {children}
  </div>
);

const Choices = ({ name, options, value, onChange }: { name: string; options: Option[]; value: string; onChange: (v: string) => void }) => (
  <RadioGroup value={value} onValueChange={onChange} className="gap-2">
    {options.map((o) => (
      <Label
        key={o.value}
        htmlFor={`${name}-${o.value}`}
        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer font-normal hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
      >
        <RadioGroupItem id={`${name}-${o.value}`} value={o.value} />
        {o.label}
      </Label>
    ))}
  </RadioGroup>
);

export default function PesquisaSatisfacaoLogistica() {
  const [searchParams] = useSearchParams();
  const clienteCodigo = searchParams.get("cliente")?.slice(0, 50) || null;

  const [clienteNome, setClienteNome] = useState("");
  const [prazo, setPrazo] = useState("");
  const [condicao, setCondicao] = useState("");
  const [pedido, setPedido] = useState("");
  const [notaAtendimento, setNotaAtendimento] = useState<number | null>(null);
  const [notaSatisfacao, setNotaSatisfacao] = useState<number | null>(null);
  const [sugestao, setSugestao] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const complete = prazo && condicao && pedido && notaAtendimento && notaSatisfacao;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) {
      toast.error("Responda as perguntas de 1 a 5 antes de enviar.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("pesquisa_satisfacao_logistica").insert({
      cliente_nome: clienteNome.trim() || null,
      cliente_codigo: clienteCodigo,
      entrega_no_prazo: prazo,
      condicao_produtos: condicao,
      pedido_correto: pedido,
      nota_atendimento: notaAtendimento,
      nota_satisfacao: notaSatisfacao,
      sugestao_melhoria: sugestao.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar sua resposta. Tente novamente.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600 mb-2" />
            <CardTitle className="text-2xl">Obrigado pela sua resposta!</CardTitle>
            <CardDescription>Sua opinião nos ajuda a melhorar nossas entregas.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted py-8 px-4">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-4">
        <div className="flex justify-center">
          <img src={logoLopes} alt="Distribuidora Lopes" className="h-14 object-contain" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Pesquisa de Qualidade da Entrega</CardTitle>
            <CardDescription>Leva menos de 1 minuto. Obrigado por ajudar!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="cliente-nome">Nome do estabelecimento (opcional)</Label>
              <Input
                id="cliente-nome"
                value={clienteNome}
                maxLength={200}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: Mercadinho São José"
              />
            </div>

            <Question n={1} title="Seu pedido foi entregue dentro do prazo informado/combinado?">
              <Choices name="prazo" options={PRAZO} value={prazo} onChange={setPrazo} />
            </Question>

            <Question n={2} title="Os produtos chegaram em boas condições, sem avarias ou problemas de conservação?">
              <Choices name="condicao" options={CONDICAO} value={condicao} onChange={setCondicao} />
            </Question>

            <Question
              n={3}
              title="O pedido recebido estava correto em relação ao que foi faturado/solicitado?"
              hint="Considerando produtos e quantidades."
            >
              <Choices name="pedido" options={PEDIDO} value={pedido} onChange={setPedido} />
            </Question>

            <Question n={4} title="Como você avalia o atendimento da nossa equipe no momento da entrega?">
              <StarRating value={notaAtendimento} onChange={setNotaAtendimento} labels={LABELS_ATENDIMENTO} />
            </Question>

            <Question n={5} title="De forma geral, qual o seu nível de satisfação com o serviço de entrega da Lopes?">
              <StarRating value={notaSatisfacao} onChange={setNotaSatisfacao} labels={LABELS_SATISFACAO} />
            </Question>

            <Question n={6} title="O que poderíamos melhorar em nossas entregas?">
              <Textarea
                value={sugestao}
                maxLength={2000}
                onChange={(e) => setSugestao(e.target.value)}
                placeholder="Escreva aqui sua sugestão (opcional)"
                rows={4}
              />
            </Question>

            <Button type="submit" className="w-full h-12 text-base" disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar resposta
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
