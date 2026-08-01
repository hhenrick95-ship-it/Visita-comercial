import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { LogOut, Menu, X, Settings, Users, UsersRound, FileText, Presentation, MapPinOff } from "lucide-react";
import { useState, useEffect } from "react";
import logoLopes from "@/assets/logo-lopes.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Componente extraído para evitar duplicação e garantir consistência
const SettingsMenu = ({ 
  items, 
  onItemClick 
}: { 
  items: { path: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  onItemClick?: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button 
        id="navbar-settings"
        data-testid="navbar-settings"
        variant="outline" 
        size="icon" 
        className="shrink-0 h-9 w-9 border-border"
        aria-label="Configurações"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent 
      align="end" 
      className="w-56 bg-popover border border-border shadow-lg z-[600]"
      sideOffset={5}
    >
      {items.map((item) => (
        <DropdownMenuItem key={item.path} asChild>
          <Link 
            to={item.path} 
            className="flex items-center cursor-pointer"
            onClick={onItemClick}
          >
            <item.icon className="h-4 w-4 mr-2" />
            {item.label}
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export const Navbar = () => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = role === "admin";

  // Diagnóstico: verificar se o botão existe e está visível
  useEffect(() => {
    const checkSettingsButton = () => {
      const btn = document.getElementById("navbar-settings");
      if (!btn) {
        console.warn("[Navbar] ⚠️ Settings button NOT FOUND in DOM");
        return;
      }
      const rect = btn.getBoundingClientRect();
      const isOffscreen = rect.right < 0 || rect.left > window.innerWidth || rect.bottom < 0 || rect.top > window.innerHeight;
      if (isOffscreen) {
        console.warn("[Navbar] ⚠️ Settings button exists but is OFF-SCREEN", rect);
      }
    };
    
    // Check after render
    const timer = setTimeout(checkSettingsButton, 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Main navigation items (shown in navbar)
  const mainNavItems = [
    { path: "/", label: "Home", roles: ["admin", "gestor", "usuario"] },
    { path: "/dashboard", label: "Dashboard", roles: ["admin", "gestor", "usuario"] },
    { path: "/feedbacks", label: "Feedbacks", roles: ["admin", "gestor", "usuario"] },
    { path: "/visitas", label: "Visitas", roles: ["admin", "gestor", "usuario"] },
    { path: "/form-builder", label: "Editor de Formulário", roles: ["admin"] },
  ];

  // Settings menu items (shown in dropdown)
  const settingsItems = [
    { path: "/tutorial", label: "Tutorial", icon: Presentation, roles: ["admin", "gestor", "usuario"] },
    { path: "/documentation", label: "Documentação", icon: FileText, roles: ["admin", "gestor", "usuario"] },
    { path: "/users", label: "Usuários", icon: Users, roles: ["admin"] },
    { path: "/team-management", label: "Equipes", icon: UsersRound, roles: ["admin"] },
    { path: "/sem-localizacao", label: "Sem Localização", icon: MapPinOff, roles: ["admin"] },
  ];

  const filteredMainItems = mainNavItems.filter((item) =>
    item.roles.includes(role || "")
  );

  const filteredSettingsItems = settingsItems.filter((item) =>
    item.roles.includes(role || "")
  );

  return (
    <nav className="glass-card border-0 border-b border-border/60 sticky top-0 z-[200] isolate backdrop-blur-xl">
      <div className="container mx-auto px-4">
        {/* 
          LAYOUT: CSS Grid com 3 colunas fixas
          - Coluna 1 (auto): Logo - nunca encolhe
          - Coluna 2 (1fr): Links centrais - absorve espaço excedente
          - Coluna 3 (auto): Área direita - NUNCA encolhe, NUNCA sai da tela
        */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 gap-4">
          
          {/* ========== COLUNA 1: Logo ========== */}
          <div className="flex items-center shrink-0">
            <Link to="/" aria-label="Ir para Home" className="flex items-center">
              <img
                src={logoLopes}
                alt="Logo Lopes"
                className="h-14 w-auto transition-transform hover:scale-105"
              />
            </Link>
          </div>

          {/* ========== COLUNA 2: Links de navegação (Desktop) ========== */}
          <div className="hidden md:flex items-center justify-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center space-x-1 whitespace-nowrap">
              {filteredMainItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? "default" : "ghost"}
                    size="sm"
                    className={
                      location.pathname === item.path
                        ? "bg-hero-gradient text-primary-foreground border-0 shadow-md hover:opacity-95"
                        : ""
                    }
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          {/* Espaço vazio no mobile para manter o grid */}
          <div className="md:hidden" />

          {/* ========== COLUNA 3: Área direita ========== */}
          {/* Desktop: Email + Badge + Engrenagem + Sair */}
          <div className="hidden md:flex items-center gap-2 shrink-0 min-w-fit">
            {/* Email do usuário + Badge Admin */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="max-w-[120px] truncate">{user?.email}</span>
              {isAdmin && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Admin
                </Badge>
              )}
            </div>

            {/* ⚠️ ENGRENAGEM - SEMPRE VISÍVEL */}
            <SettingsMenu items={filteredSettingsItems} />

            {/* Botão Sair */}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sair
            </Button>
          </div>

          {/* Mobile: Engrenagem + Menu Button */}
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <SettingsMenu 
              items={filteredSettingsItems} 
              onItemClick={() => setMobileMenuOpen(false)}
            />

            {/* Botão Menu Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* ========== Mobile Navigation Menu ========== */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border">
            {filteredMainItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  {item.label}
                </Button>
              </Link>
            ))}

            <div className="pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground mb-2 px-3 flex items-center gap-2">
                <span className="truncate">{user?.email}</span>
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Admin
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
