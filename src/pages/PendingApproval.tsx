import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const { user, isApproved, signOut, refreshRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isApproved) {
      navigate("/");
    }
  }, [isApproved, navigate]);

  const handleRefresh = async () => {
    await refreshRole();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
            <CardDescription>
              Sua conta está pendente de aprovação por um administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Conta cadastrada:</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Um administrador precisa aprovar seu acesso ao sistema. Você receberá
                uma notificação assim que sua conta for aprovada.
              </p>
              <p>
                Enquanto isso, você pode fazer logout ou atualizar o status da sua conta.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleRefresh} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Status
              </Button>
              <Button onClick={signOut} variant="secondary" className="w-full">
                Fazer Logout
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
