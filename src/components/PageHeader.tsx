import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Conteúdo opcional alinhado à direita (botões, ações, etc.) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão das páginas internas — combina visualmente com a Home:
 * card glass com mesh radial, título em gradiente e ícone de destaque.
 * Não altera comportamento — apenas envolve título/descrição/ações.
 */
export const PageHeader = ({
  icon: Icon,
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) => {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl glass-card p-5 md:p-7 ${className}`}
    >
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-hero-gradient opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-hero-gradient opacity-15 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className="shrink-0 h-12 w-12 rounded-xl bg-hero-gradient flex items-center justify-center shadow-lg">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-hero-gradient bg-clip-text text-transparent">
              {title}
            </h1>
            {description && (
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};

export default PageHeader;