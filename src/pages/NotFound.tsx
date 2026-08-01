import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Página não encontrada</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Voltar para Início
          </a>
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
};

export default NotFound;
