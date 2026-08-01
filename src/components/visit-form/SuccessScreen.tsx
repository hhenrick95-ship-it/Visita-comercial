import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, FileDown, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoLopes from "@/assets/logo-lopes.png";

interface SuccessScreenProps {
  onGeneratePDF: () => void;
  onNavigateToFeedback: () => void;
  onNewForm: () => void;
}

export function SuccessScreen({ onGeneratePDF, onNavigateToFeedback, onNewForm }: SuccessScreenProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-2xl border-primary/20">
        <CardContent className="p-6 sm:p-10 text-center space-y-6">
          <img 
            src={logoLopes} 
            alt="Lopes Distribuidora" 
            className="mx-auto w-36 sm:w-44 h-auto cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate("/")}
          />
          
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-success" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-success">Formulário Enviado!</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Obrigado por preencher o formulário de visita. 
              Suas informações foram registradas com sucesso.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              size="lg" 
              onClick={onGeneratePDF}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <FileDown className="mr-2 h-5 w-5" />
              Exportar PDF
            </Button>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={onNavigateToFeedback}
              className="w-full"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Dar Feedback à Rota
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={onNewForm}
              className="w-full"
            >
              Novo Formulário
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
