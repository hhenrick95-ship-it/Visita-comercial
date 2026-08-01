const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 mt-auto border-t bg-background">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>© {currentYear} LOPES DISTRIBUIDORA. Todos os direitos reservados.</p>
        <p className="mt-1 font-medium">Desenvolvido pelo time de Inteligência de Mercado</p>
      </div>
    </footer>
  );
};

export { Footer };
