import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";
import logoLopes from "@/assets/logo-lopes.png";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, isApproved, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  // Redirecionar quando autenticado
  useEffect(() => {
    if (!authLoading && user) {
      if (isApproved) {
        navigate("/", { replace: true });
      } else {
        navigate("/pending", { replace: true });
      }
    }
  }, [user, isApproved, authLoading, navigate]);

  // Login state - 2 etapas
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  
  // Password reset state
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const handleContinue = async () => {
    if (!loginEmail.trim() || !loginEmail.includes("@")) {
      toast.error("Digite um email válido");
      return;
    }
    
    setLoading(true);
    try {
      // Use RPC function that bypasses RLS to check must_reset_password
      const { data: mustReset, error } = await supabase
        .rpc("check_must_reset_password", { user_email: loginEmail });
      
      if (!error && mustReset === true) {
        setMustResetPassword(true);
      }
      
      setEmailConfirmed(true);
    } catch (error: any) {
      console.error("Error checking profile:", error);
      setEmailConfirmed(true); // Continue anyway if there's an error
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setEmailConfirmed(false);
    setLoginPassword("");
    setMustResetPassword(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    setLoading(true);
    try {
      // Use edge function to reset password (admin function that bypasses auth)
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { 
          userEmail: loginEmail,
          newPassword: newPassword 
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Senha definida com sucesso! Faça login com sua nova senha.");
      
      // Reset state and go back to normal login
      setMustResetPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setLoginPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Erro ao definir nova senha");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-mesh relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden shadow-glow">
          <div className="text-center px-6 pt-8 pb-4 space-y-3">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-hero-gradient opacity-30 blur-xl" />
              <img
                src={logoLopes}
                alt="Logo Lopes"
                className="relative h-16 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              Sistema de Visitas
            </h1>
            <p className="text-sm text-muted-foreground">
              {showForgotPassword
                ? "Digite seu email para recuperar a senha"
                : "Faça login ou crie sua conta para continuar"}
            </p>
          </div>
          <div className="px-6 pb-8">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 hover:shadow-glow transition-all"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar Email de Recuperação"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-background/40 backdrop-blur border border-border/50">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-hero-gradient data-[state=active]:text-primary-foreground"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-hero-gradient data-[state=active]:text-primary-foreground"
                  >
                    Cadastro
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  {!emailConfirmed ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 hover:shadow-glow transition-all"
                        onClick={handleContinue}
                        disabled={loading}
                      >
                        {loading ? "Verificando..." : "Continuar"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  ) : mustResetPassword ? (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Email</Label>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
                          <span className="text-sm flex-1 truncate">{loginEmail}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleBack}
                            className="h-7 px-2 text-xs"
                          >
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            Alterar
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <KeyRound className="w-4 h-4" />
                          <span className="text-sm font-medium">Redefinição de senha necessária</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          O administrador solicitou que você defina uma nova senha.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 hover:shadow-glow transition-all"
                        disabled={loading}
                      >
                        {loading ? "Atualizando..." : "Definir Nova Senha"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Email</Label>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
                          <span className="text-sm flex-1 truncate">{loginEmail}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleBack}
                            className="h-7 px-2 text-xs"
                          >
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            Alterar
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 hover:shadow-glow transition-all"
                        disabled={loading}
                      >
                        {loading ? "Entrando..." : "Entrar"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    </form>
                  )}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="João Silva"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 hover:shadow-glow transition-all"
                      disabled={loading}
                    >
                      {loading ? "Cadastrando..." : "Criar Conta"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Sua conta precisará ser aprovada por um administrador
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
      <footer className="w-full py-6 mt-auto border-t bg-background/60 backdrop-blur relative z-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LOPES DISTRIBUIDORA. Todos os direitos reservados.</p>
          <p className="mt-1 font-medium">Desenvolvido pelo time de Inteligência de Mercado</p>
        </div>
      </footer>
    </div>
  );
}
