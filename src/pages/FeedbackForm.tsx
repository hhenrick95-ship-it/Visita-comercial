import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileDown, CheckCircle2, ArrowLeft, MessageSquare } from "lucide-react";
import logoLopes from "@/assets/logo-lopes.png";
import { generateFeedbackPDF } from "@/lib/generateFeedbackPDF";

const feedbackSchema = z.object({
  supervisor: z.string().min(1, "Nome do supervisor é obrigatório"),
  constructive_criticism: z.string().min(1, "Crítica construtiva é obrigatória"),
  action_plan: z.string().min(1, "Plano de ação é obrigatório"),
});

type FeedbackData = z.infer<typeof feedbackSchema>;

export default function FeedbackForm() {
  const navigate = useNavigate();
  const { visitId } = useParams<{ visitId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [visitData, setVisitData] = useState<any>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [submittedFeedback, setSubmittedFeedback] = useState<FeedbackData | null>(null);

  const form = useForm<FeedbackData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      supervisor: "",
      constructive_criticism: "",
      action_plan: "",
    },
  });

  useEffect(() => {
    if (visitId) {
      loadVisitData();
    }
  }, [visitId]);

  const loadVisitData = async () => {
    try {
      const { data, error } = await supabase
        .from("visit_forms")
        .select("*")
        .eq("id", visitId)
        .single();

      if (error) throw error;
      setVisitData(data);
    } catch (error) {
      console.error("Erro ao carregar dados da visita:", error);
      toast.error("Erro ao carregar dados da visita.");
    }
  };

  const onSubmit = async (data: FeedbackData) => {
    if (!visitId || !visitData) return;

    setIsSubmitting(true);
    try {
      const { data: feedbackData, error } = await supabase
        .from("feedbacks")
        .insert({
          visit_form_id: visitId,
          vendor_code: visitData.rca_accompanied,
          supervisor: data.supervisor,
          constructive_criticism: data.constructive_criticism,
          action_plan: data.action_plan,
        })
        .select();

      if (error) throw error;

      if (feedbackData && feedbackData.length > 0) {
        setFeedbackId(feedbackData[0].id);
      }

      setSubmittedFeedback(data);
      setIsSuccess(true);
      toast.success("Feedback enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateFeedbackPDF = async () => {
    if (!submittedFeedback || !visitData || !feedbackId) return;

    try {
      await generateFeedbackPDF(
        {
          id: feedbackId,
          supervisor: submittedFeedback.supervisor,
          constructive_criticism: submittedFeedback.constructive_criticism,
          action_plan: submittedFeedback.action_plan,
          vendor_code: visitData.rca_accompanied,
        },
        {
          visit_date: visitData.visit_date,
          manager: visitData.manager,
          rca_accompanied: visitData.rca_accompanied,
          client_code: visitData.client_code,
          address: visitData.address,
        }
      );
      toast.success("PDF do feedback gerado e armazenado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF do feedback.");
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="max-w-2xl w-full text-center shadow-2xl border-primary/20">
            <CardContent className="pt-12 pb-12">
              <img src={logoLopes} alt="Lopes Distribuidora" className="mx-auto w-48 h-auto mb-8" />
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-24 h-24 text-success" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-success">Feedback Enviado!</h1>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                  Seu feedback foi registrado com sucesso e será compartilhado com o vendedor.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button 
                  size="lg" 
                  onClick={handleGenerateFeedbackPDF}
                  className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 h-auto"
                >
                  <FileDown className="mr-2 h-5 w-5" />
                  Exportar PDF
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="text-lg px-8 py-6 h-auto"
                >
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <footer className="w-full py-6 mt-auto border-t bg-background">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} LOPES DISTRIBUIDORA. Todos os direitos reservados.</p>
            <p className="mt-1 font-medium">Desenvolvido pelo time de Inteligência de Mercado</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 hover:bg-primary/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

        <Card className="shadow-2xl border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl text-primary">Feedback do Gestor</CardTitle>
                <CardDescription className="text-base">
                  Forneça feedback construtivo sobre o acompanhamento da rota
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8">
            {visitData && (
              <Card className="mb-6 bg-muted/50">
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2">Informações da Visita</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-medium">Data:</span> {visitData.visit_date}</p>
                    <p><span className="font-medium">Equipe:</span> {visitData.manager}</p>
                    <p><span className="font-medium">Vendedor:</span> {visitData.rca_accompanied}</p>
                    <p><span className="font-medium">Cliente:</span> {visitData.client_code}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-form-label font-semibold">Nome do Supervisor *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite seu nome" className="border-primary/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="constructive_criticism"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-form-label font-semibold">Crítica Construtiva *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descreva os pontos de melhoria observados durante a rota..."
                          className="border-primary/30 min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="action_plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-form-label font-semibold">Plano de Ação *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descreva as ações que o vendedor deve tomar..."
                          className="border-primary/30 min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-lg py-6 h-auto"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Enviar Feedback
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </main>
      <footer className="w-full py-6 mt-auto border-t bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LOPES DISTRIBUIDORA. Todos os direitos reservados.</p>
          <p className="mt-1 font-medium">Desenvolvido pelo time de Inteligência de Mercado</p>
        </div>
      </footer>
    </div>
  );
}
