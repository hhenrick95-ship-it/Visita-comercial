import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  /**
   * Quando true (padrão), aplica o mesh gradient sutil no fundo da página
   * para manter consistência visual com a Home.
   */
  withMesh?: boolean;
}

const Layout = ({ children, showNavbar = true, withMesh = true }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showNavbar && <Navbar />}
      <main className={`flex-1 relative ${withMesh ? "bg-mesh" : ""}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export { Layout };
